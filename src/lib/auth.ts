import { NextRequest, NextResponse } from 'next/server'
import { db } from './db'
import { SignJWT, jwtVerify } from 'jose'

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'edulearn-pro-access-secret-dev-only-change-in-prod'
)
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'edulearn-pro-refresh-secret-dev-only-change-in-prod'
)

export const ACCESS_TOKEN_TTL = '15m'
export const REFRESH_TOKEN_TTL_DAYS = 7

export interface SessionUser {
  id: string
  email: string
  role: 'ADMIN' | 'STUDENT'
  name: string
  status: string
}

export async function signAccessToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(ACCESS_SECRET)
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, kind: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_DAYS}d`)
    .sign(REFRESH_SECRET)
}

export async function verifyAccessToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET)
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
 * or a non-httpOnly `access_token` cookie. Refresh tokens are stored httpOnly and
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
  }

  return {
    user: sessionUser,
    requestId: req.headers.get('x-request-id') || cryptoRandomId(),
    ip: getClientIp(req),
    userAgent: req.headers.get('user-agent') || 'unknown',
  }
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

export function cryptoRandomId(): string {
  return nanoidSafe()
}

function nanoidSafe(): string {
  // Avoid ESM import edge cases; use crypto.randomUUID when available
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID()
    }
  } catch {
    /* noop */
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function requireAdmin(req: NextRequest): Promise<AuthContext | null> {
  const ctx = await getAuthContext(req)
  if (!ctx) return null
  if (ctx.user.role !== 'ADMIN') return null
  return ctx
}

export async function requireActiveStudent(req: NextRequest): Promise<AuthContext | null> {
  const ctx = await getAuthContext(req)
  if (!ctx) return null
  if (ctx.user.role !== 'STUDENT') return null
  // ACTIVE or APPROVED both can access learning content per spec; we treat APPROVED as ready
  if (ctx.user.status !== 'ACTIVE' && ctx.user.status !== 'APPROVED') return null
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
 * Set auth cookies (access + refresh) on a NextResponse. Access token is also
 * exposed to client via a non-httpOnly cookie so the SPA can read it for API calls.
 */
export function setAuthCookies(res: NextResponse, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production'
  res.cookies.set('access_token', accessToken, {
    httpOnly: false, // SPA needs to send via Authorization header
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
