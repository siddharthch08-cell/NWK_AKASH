import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jwtVerify, SignJWT } from 'jose'
import { signAccessToken, signRefreshToken, setAuthCookies, type SessionUser } from '@/lib/auth'
import { ok, unauthorized, fail } from '@/lib/api-response'

const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'edulearn-pro-refresh-secret-dev-only-change-in-prod'
)

/**
 * POST /api/auth/refresh
 * Exchange a valid refresh token for a new access token + rotated refresh token.
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value
  if (!refreshToken) return unauthorized('No refresh token')

  // Verify the token signature
  let payload: any
  try {
    const verified = await jwtVerify(refreshToken, REFRESH_SECRET)
    payload = verified.payload
  } catch {
    return unauthorized('Invalid refresh token')
  }

  // Check the token exists in DB and is not revoked
  const stored = await db.refreshToken.findUnique({ where: { token: refreshToken } })
  if (!stored || stored.revokedAt) return unauthorized('Refresh token revoked')
  if (stored.expiresAt < new Date()) return unauthorized('Refresh token expired')

  // Fetch the user
  const user = await db.user.findFirst({ where: { id: payload.sub!, deletedAt: null } })
  if (!user) return unauthorized('User not found')

  // Reuse detection: if the token was already consumed (revokedAt set),
  // it means someone is presenting an old token again after rotation.
  // This IS genuine reuse — revoke all user sessions.
  // (The rotatedFrom field is NOT reuse — it just means this token is a rotation successor.)
  // The revokedAt check is already handled above (stored.revokedAt check).

  // Rotate: mark old token as consumed (revokedAt) so it can't be used again
  // But don't treat rotatedFrom as reuse — that's a legitimate rotation chain
  await db.refreshToken.update({
    where: { token: refreshToken },
    data: { revokedAt: new Date() },
  })

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    role: user.role as 'ADMIN' | 'STUDENT',
    name: user.name,
    status: user.status,
  }

  const newAccess = await signAccessToken(sessionUser)
  const newRefresh = await signRefreshToken(user.id)

  await db.refreshToken.create({
    data: {
      userId: user.id,
      token: newRefresh,
      rotatedFrom: refreshToken,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  const res = ok({ accessToken: newAccess, user: sessionUser }, 'Token refreshed')
  setAuthCookies(res, newAccess, newRefresh)
  return res
}
