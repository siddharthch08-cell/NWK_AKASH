import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/lib/db'
import { getJwtSecrets } from '@/config'
import { hashRefreshToken, signAccessToken, signRefreshToken, setAuthCookies, LOGINABLE_STATUSES, type AuthContext, type SessionUser } from '@/lib/auth'
import { ok, tooMany, unauthorized } from '@/lib/api-response'
import { enforceRateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { getTrustedClientIp, requestId } from '@/lib/request-security'


export async function POST(req: NextRequest) {
  const rawToken = req.cookies.get('refresh_token')?.value
  if (!rawToken) return unauthorized('No refresh token')
  const tokenHash = hashRefreshToken(rawToken)
  const limit = await enforceRateLimit(req, 'refresh', tokenHash)
  if (!limit.ok) return tooMany('Too many refresh attempts.', limit.retryAfterMs, requestId(req))

  let subject: string
  try {
    const verified = await jwtVerify(rawToken, getJwtSecrets().refreshSecret)
    if (verified.payload.kind !== 'refresh' || !verified.payload.sub) throw new Error('Wrong token kind')
    subject = verified.payload.sub
  } catch {
    return unauthorized('Invalid refresh token')
  }

  const stored = await db.refreshToken.findUnique({ where: { token: tokenHash } })
  if (!stored || stored.userId !== subject) return unauthorized('Refresh token revoked')
  const user = await db.user.findFirst({ where: { id: subject, deletedAt: null } })
  if (!user) return unauthorized('User not found')
  const ctx: AuthContext = {
    user: { id: user.id, email: user.email, role: user.role as 'ADMIN' | 'STUDENT', name: user.name, status: user.status, mustChangePassword: user.mustChangePassword },
    requestId: requestId(req), ip: getTrustedClientIp(req), userAgent: req.headers.get('user-agent') || 'unknown',
  }

  if (stored.revokedAt) {
    await db.refreshToken.updateMany({ where: { familyId: stored.familyId, revokedAt: null }, data: { revokedAt: new Date() } })
    await audit({ ctx, action: 'REFRESH_TOKEN_REUSE_DETECTED', entityType: 'SESSION', entityId: stored.familyId, outcome: 'DENIED' })
    return unauthorized('Refresh token reuse detected; session family revoked')
  }
  if (stored.expiresAt <= new Date()) return unauthorized('Refresh token expired')
  if (user.role === 'STUDENT' && !LOGINABLE_STATUSES.has(user.status)) {
    await db.refreshToken.updateMany({ where: { familyId: stored.familyId, revokedAt: null }, data: { revokedAt: new Date() } })
    return unauthorized('Account is not active')
  }

  const sessionUser: SessionUser = ctx.user
  const newAccess = await signAccessToken(sessionUser)
  const newRefresh = await signRefreshToken(user.id)
  const newHash = hashRefreshToken(newRefresh)
  const rotated = await db.$transaction(async tx => {
    const consumed = await tx.refreshToken.updateMany({ where: { id: stored.id, revokedAt: null }, data: { revokedAt: new Date() } })
    if (consumed.count !== 1) return false
    await tx.refreshToken.create({ data: { userId: user.id, token: newHash, familyId: stored.familyId, rotatedFrom: tokenHash, ip: ctx.ip, userAgent: ctx.userAgent, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } })
    return true
  })
  if (!rotated) {
    await db.refreshToken.updateMany({ where: { familyId: stored.familyId, revokedAt: null }, data: { revokedAt: new Date() } })
    return unauthorized('Refresh token already consumed')
  }
  await audit({ ctx, action: 'REFRESH_TOKEN_ROTATED', entityType: 'SESSION', entityId: stored.familyId, outcome: 'SUCCESS' })
  const response = ok({ accessToken: newAccess, user: sessionUser }, 'Token refreshed')
  setAuthCookies(response, newAccess, newRefresh)
  return response
}
