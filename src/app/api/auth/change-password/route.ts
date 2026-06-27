import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthContext, verifyPassword, hashPassword } from '@/lib/auth'
import { changePasswordSchema } from '@/lib/validation'
import { ok, fromZodError, unauthorized, fail, serverError } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return unauthorized('Authentication required')

  const ip = ctx.ip
  const rl = rateLimit(`pwchange:${ip}`, 5, 60 * 60 * 1000)
  if (!rl.ok) return fail('RATE_LIMITED', 'Too many password change attempts.', 429)

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
  await db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })

  // Revoke all existing refresh tokens (force re-login on other devices)
  await db.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  })

  await audit({ ctx, action: 'PASSWORD_CHANGED', entityType: 'USER', entityId: user.id })

  return ok({}, 'Password changed successfully. Please log in again on other devices.')
}
