import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { loginSchema } from '@/lib/validation'
import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  type AuthContext,
} from '@/lib/auth'
import { ok, fromZodError, unauthorized, serverError, tooMany, forbidden } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_MS = 15 * 60 * 1000

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const rl = rateLimit(`login:${ip}`, 10, 60 * 1000)
  if (!rl.ok) return tooMany('Too many login attempts. Please slow down.')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const { email, password, role } = parsed.data

  const user = await db.user.findUnique({ where: { email } })
  if (!user || user.deletedAt) {
    // Generic message — do not leak which field is wrong
    return unauthorized('Invalid email or password')
  }

  // Optional role gating on the login form (admin vs student tab)
  if (role && user.role !== role) {
    return forbidden(`This account is not a ${role.toLowerCase()} account.`)
  }

  // Lockout check
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return tooMany('Account temporarily locked due to repeated failed attempts. Try again later.')
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    const failedCount = user.failedLoginCount + 1
    const lockUntil =
      failedCount >= LOCKOUT_THRESHOLD ? new Date(Date.now() + LOCKOUT_MS) : null
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: failedCount, lockedUntil: lockUntil },
    })
    const ctx: AuthContext = {
      user: { id: user.id, email: user.email, role: user.role as any, name: user.name, status: user.status },
      requestId: crypto.randomUUID(),
      ip,
      userAgent: req.headers.get('user-agent') || 'unknown',
    }
    await audit({
      ctx,
      action: user.role === 'ADMIN' ? 'ADMIN_LOGIN_FAILED' : 'STUDENT_LOGIN_FAILED',
      entityType: 'USER',
      entityId: user.id,
    })
    return unauthorized('Invalid email or password')
  }

  // Reset failed attempts, update last login
  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  })

  // Create session record
  await db.userSession.create({
    data: {
      userId: user.id,
      ip,
      userAgent: req.headers.get('user-agent'),
    },
  })

  const access = await signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role as 'ADMIN' | 'STUDENT',
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
    user: { id: user.id, email: user.email, role: user.role as any, name: user.name, status: user.status },
    requestId: crypto.randomUUID(),
    ip,
    userAgent: req.headers.get('user-agent') || 'unknown',
  }
  await audit({
    ctx,
    action: user.role === 'ADMIN' ? 'ADMIN_LOGIN' : 'STUDENT_LOGIN',
    entityType: 'USER',
    entityId: user.id,
  })

  const res = ok(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        phone: user.phone,
        photo: user.photo,
        rejectionReason: user.rejectionReason,
      },
      accessToken: access,
    },
    'Login successful'
  )
  setAuthCookies(res, access, refresh)
  return res
}
