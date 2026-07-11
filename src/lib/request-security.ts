import { createHash, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

function equalSecret(actual: string | null, expected: string): boolean {
  if (!actual || !expected) return false
  const left = createHash('sha256').update(actual).digest()
  const right = createHash('sha256').update(expected).digest()
  return timingSafeEqual(left, right)
}

export function getTrustedClientIp(req: NextRequest): string {
  const trustProxy = process.env.TRUST_PROXY === 'true'
  const proxySecret = process.env.PROXY_SHARED_SECRET || ''
  const trusted = trustProxy && proxySecret.length >= 32 && equalSecret(req.headers.get('x-proxy-secret'), proxySecret)
  if (!trusted) return 'untrusted-direct'
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip')?.trim() || 'unknown-proxied'
}

export function requestId(req: NextRequest): string {
  const supplied = req.headers.get('x-request-id')
  return supplied && /^[a-zA-Z0-9._-]{8,128}$/.test(supplied) ? supplied : crypto.randomUUID()
}
