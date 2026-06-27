import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthContext, clearAuthCookies } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'
import { audit } from '@/lib/audit'

export async function POST(req: NextRequest) {
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
  const refreshToken = req.cookies.get('refresh_token')?.value
  if (refreshToken) {
    await db.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  await audit({ ctx, action: 'LOGOUT', entityType: 'USER', entityId: ctx.user.id })

  const res = ok({}, 'Logged out successfully')
  clearAuthCookies(res)
  return res
}
