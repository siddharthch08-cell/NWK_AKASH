import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthContext, clearAuthCookies, hashRefreshToken } from '@/lib/auth'
import { ok } from '@/lib/api-response'
import { audit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value
  if (refreshToken) {
    await db.refreshToken.updateMany({
      where: { token: hashRefreshToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
  const ctx = await getAuthContext(req)
  if (!ctx) {
    // Even if no context, clear cookies
    const res = ok({}, 'Logged out')
    clearAuthCookies(res)
    return res
  }

  // Revoke the refresh token (best-effort by user — we revoke all of user's tokens
  // matching the current UA for simplicity; full per-token revoke would require
  // passing the refresh token in the body).
  await audit({ ctx, action: 'LOGOUT', entityType: 'USER', entityId: ctx.user.id })

  const res = ok({}, 'Logged out successfully')
  clearAuthCookies(res)
  return res
}
