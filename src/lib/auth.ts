import { NextRequest, NextResponse } from 'next/server'
import { db } from './db'
import { SignJWT, jwtVerify } from 'jose'
import { createHash } from 'node:crypto'
import { getJwtSecrets } from '@/config'
import { getTrustedClientIp, requestId } from './request-security'
import type { SessionUser } from '@/types'

export type { SessionUser }

export const ACCESS_TOKEN_TTL = '15m'
export const REFRESH_TOKEN_TTL_DAYS = 7

export async function signAccessToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getJwtSecrets().accessSecret)
}

export async function signRefreshToken(userId: string, tokenId = crypto.randomUUID()): Promise<string> {
  return new SignJWT({ sub: userId, kind: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setJti(tokenId)
    .setExpirationTime(`${REFRESH_TOKEN_TTL_DAYS}d`)
    .sign(getJwtSecrets().refreshSecret)
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export async function verifyAccessToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecrets().accessSecret)
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

export async function hashPassword(plain: string): Promise<string> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(plain, hash)
}

export interface AuthContext {
  user: SessionUser
  requestId: string
  ip: string
  userAgent: string
}

/**
 * Resolve the authenticated user from a request. Accepts `Authorization: Bearer <token>`
 * or the httpOnly `access_token` cookie. Refresh tokens are stored httpOnly and
 * rotated via /api/auth/refresh — kept simple here for the single-page sandbox.
 */
export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  let token: string | undefined
  const auth = req.headers.get('authorization')
  if (auth?.toLowerCase().startsWith('bearer ')) {
    token = auth.slice(7).trim()
  }
  if (!token) {
    token = req.cookies.get('access_token')?.value
  }
  if (!token) return null

  const payload = await verifyAccessToken(token)
  if (!payload) return null

  // Re-fetch to ensure user is still valid & current status
  const dbUser = await db.user.findFirst({
    where: { id: payload.id, deletedAt: null },
  })
  if (!dbUser) return null

  // For students, ensure status hasn't degraded (admins always active)
  const sessionUser: SessionUser = {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role as 'ADMIN' | 'STUDENT',
    name: dbUser.name,
    status: dbUser.status,
    mustChangePassword: dbUser.mustChangePassword,
  }

  return {
    user: sessionUser,
    requestId: requestId(req),
    ip: getTrustedClientIp(req),
    userAgent: req.headers.get('user-agent') || 'unknown',
  }
}

export function getClientIp(req: NextRequest): string {
  return getTrustedClientIp(req)
}

export function cryptoRandomId(): string {
  return nanoidSafe()
}

function nanoidSafe(): string {
  // Use Node.js crypto for secure randomness — never fall back to Math.random()
  return crypto.randomUUID()
}

export async function requireAdmin(req: NextRequest): Promise<AuthContext | null> {
  const ctx = await getAuthContext(req)
  if (!ctx) return null
  if (ctx.user.role !== 'ADMIN') return null
  if (ctx.user.mustChangePassword) return null
  return ctx
}

export const LOGINABLE_STATUSES = new Set(['APPROVED', 'ACTIVE'])

export async function requireActiveStudent(req: NextRequest): Promise<AuthContext | null> {
  const ctx = await getAuthContext(req)
  if (!ctx) return null
  if (ctx.user.role !== 'STUDENT') return null
  if (!LOGINABLE_STATUSES.has(ctx.user.status)) return null
  return ctx
}

export async function requireStudent(req: NextRequest): Promise<AuthContext | null> {
  // Returns ctx for any student regardless of status; caller checks status
  const ctx = await getAuthContext(req)
  if (!ctx) return null
  if (ctx.user.role !== 'STUDENT') return null
  return ctx
}

/**
 * Set auth cookies (access + refresh) on a NextResponse. Both cookies are
 * inaccessible to browser JavaScript.
 */
export function setAuthCookies(res: NextResponse, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production'
  res.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  })
  res.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * REFRESH_TOKEN_TTL_DAYS,
  })
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.delete('access_token')
  res.cookies.delete('refresh_token')
}
