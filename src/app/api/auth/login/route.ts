import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { loginSchema } from '@/lib/validation'
import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  hashRefreshToken,
  setAuthCookies,
  LOGINABLE_STATUSES,
  type AuthContext,
} from '@/lib/auth'
import { ok, fromZodError, unauthorized, tooMany, forbidden } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { enforceRateLimit } from '@/lib/rate-limit'
import { getTrustedClientIp, requestId } from '@/lib/request-security'

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_MS = 15 * 60 * 1000

export async function POST(req: NextRequest) {
  const ip = getTrustedClientIp(req)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const { email, password, role } = parsed.data
  const rl = await enforceRateLimit(req, 'login', email)
  if (!rl.ok) return tooMany('Too many login attempts. Please slow down.', rl.retryAfterMs, requestId(req))

  const user = await db.user.findUnique({ where: { email } })
  if (!user || user.deletedAt) {
    // Generic message - do not leak which field is wrong
    return unauthorized('Invalid email or password')
  }

  // Optional role gating on the login form (admin vs student tab)
  if (role && user.role !== role) {
    return unauthorized('Invalid email or password')
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
      user: { id: user.id, email: user.email, role: user.role as any, name: user.name, status: user.status, mustChangePassword: user.mustChangePassword },
      requestId: requestId(req),
      ip,
      userAgent: req.headers.get('user-agent') || 'unknown',
    }
    await audit({
      ctx,
      action: user.role === 'ADMIN' ? 'ADMIN_LOGIN_FAILED' : 'STUDENT_LOGIN_FAILED',
      entityType: 'USER',
      entityId: user.id,
      outcome: 'DENIED',
    })
    return unauthorized('Invalid email or password')
  }

  // Password is valid. Now check account status for students.
  if (user.role === 'STUDENT' && !LOGINABLE_STATUSES.has(user.status)) {
    const deniedCtx: AuthContext = {
      user: { id: user.id, email: user.email, role: 'STUDENT', name: user.name, status: user.status, mustChangePassword: user.mustChangePassword },
      requestId: requestId(req), ip, userAgent: req.headers.get('user-agent') || 'unknown',
    }
    await audit({ ctx: deniedCtx, action: 'STUDENT_LOGIN_FAILED', entityType: 'USER', entityId: user.id, outcome: 'DENIED', after: { accountStatus: user.status } })
    if (user.status === 'PENDING') return forbidden('Your account is pending administrator approval.')
    if (user.status === 'REJECTED') return forbidden('Your account is not currently approved. Please contact the administrator.')
    if (user.status === 'SUSPENDED' || user.status === 'BLOCKED') return forbidden('Your account has been suspended. Please contact the administrator.')
    return forbidden('Your account is not in an active state. Please contact the administrator.')
  }

  // Reset failed attempts, update last login
  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  })

  const access = await signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role as 'ADMIN' | 'STUDENT',
    name: user.name,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
  })
  const refreshFamilyId = crypto.randomUUID()
  const refresh = await signRefreshToken(user.id)
  await db.refreshToken.create({
    data: {
      userId: user.id,
      token: hashRefreshToken(refresh),
      familyId: refreshFamilyId,
      ip,
      userAgent: req.headers.get('user-agent'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  const ctx: AuthContext = {
    user: { id: user.id, email: user.email, role: user.role as any, name: user.name, status: user.status, mustChangePassword: user.mustChangePassword },
    requestId: requestId(req),
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
        mustChangePassword: user.mustChangePassword,
      },
      accessToken: access,
    },
    'Login successful'
  )
  setAuthCookies(res, access, refresh)
  return res
}
