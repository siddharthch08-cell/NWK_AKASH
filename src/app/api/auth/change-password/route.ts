import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthContext, verifyPassword, hashPassword } from '@/lib/auth'
import { changePasswordSchema } from '@/lib/validation'
import { ok, fromZodError, unauthorized, fail, tooMany } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return unauthorized('Authentication required')

  const rl = await enforceRateLimit(req, 'passwordChange', ctx.user.id)
  if (!rl.ok) return tooMany('Too many password change attempts.', rl.retryAfterMs, ctx.requestId)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }

  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const user = await db.user.findUnique({ where: { id: ctx.user.id } })
  if (!user) return unauthorized('Not authenticated')

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash)
  if (!valid) {
    return fail('INVALID_PASSWORD', 'Current password is incorrect', 400, { currentPassword: 'Incorrect password' })
  }

  if (parsed.data.newPassword === parsed.data.currentPassword) {
    return fail('VALIDATION_ERROR', 'New password must be different from current password', 400, {
      newPassword: 'Must be different from current password',
    })
  }

  const newHash = await hashPassword(parsed.data.newPassword)
  await db.$transaction(async tx => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash: newHash, mustChangePassword: false } })
    await tx.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  })

  await audit({ ctx, action: 'PASSWORD_CHANGED', entityType: 'USER', entityId: user.id })

  return ok({}, 'Password changed successfully. Please log in again on other devices.')
}
