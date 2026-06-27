import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { registerSchema } from '@/lib/validation'
import { hashPassword, signAccessToken, signRefreshToken, setAuthCookies, type AuthContext } from '@/lib/auth'
import { ok, fromZodError, conflict, tooMany, fail } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const rl = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000) // 5/hour
  if (!rl.ok) return tooMany('Too many registration attempts. Please try again later.')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const { name, email, phone, password, preferredBatchId, termsAccepted } = parsed.data

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return conflict('An account with this email already exists')
  }

  const passwordHash = await hashPassword(password)
  const user = await db.user.create({
    data: {
      email,
      name,
      phone: phone || null,
      passwordHash,
      role: 'STUDENT',
      status: 'PENDING',
      preferredBatchId: preferredBatchId || null,
      termsAccepted,
    },
  })

  // Issue tokens so the SPA can route them to a pending-status screen
  const access = await signAccessToken({
    id: user.id,
    email: user.email,
    role: 'STUDENT',
    name: user.name,
    status: user.status,
  })
  const refresh = await signRefreshToken(user.id)
  await db.refreshToken.create({
    data: {
      userId: user.id,
      token: refresh,
      ip,
      userAgent: req.headers.get('user-agent'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  const ctx: AuthContext = {
    user: { id: user.id, email: user.email, role: 'STUDENT', name: user.name, status: user.status },
    requestId: crypto.randomUUID(),
    ip,
    userAgent: req.headers.get('user-agent') || 'unknown',
  }
  await audit({ ctx, action: 'STUDENT_REGISTER', entityType: 'USER', entityId: user.id, after: { email, name, status: 'PENDING' } })

  const res = ok({ user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status }, accessToken: access }, 'Registration successful. Your account is pending admin approval.')
  setAuthCookies(res, access, refresh)
  return res
}
