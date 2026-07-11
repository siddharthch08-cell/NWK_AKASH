import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getTrustedClientIp, requestId } from '@/lib/request-security'
import { enforceRateLimit, resetMemoryRateLimitsForTests } from '@/lib/rate-limit'

const proxySecret = 'p'.repeat(32)

describe('trusted proxy and rate limiting', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL
    process.env.TRUST_PROXY = 'true'
    process.env.PROXY_SHARED_SECRET = proxySecret
    resetMemoryRateLimitsForTests()
  })
  afterEach(() => {
    delete process.env.TRUST_PROXY
    delete process.env.PROXY_SHARED_SECRET
  })

  it('ignores spoofed forwarding headers without proxy authentication', () => {
    const spoofed = new NextRequest('http://localhost/api', { headers: { 'x-forwarded-for': '203.0.113.9' } })
    const trusted = new NextRequest('http://localhost/api', { headers: { 'x-forwarded-for': '203.0.113.9', 'x-proxy-secret': proxySecret } })
    expect(getTrustedClientIp(spoofed)).toBe('untrusted-direct')
    expect(getTrustedClientIp(trusted)).toBe('203.0.113.9')
  })

  it('accepts only safe request identifiers', () => {
    const accepted = new NextRequest('http://localhost/api', { headers: { 'x-request-id': 'request-1234' } })
    const rejected = new NextRequest('http://localhost/api', { headers: { 'x-request-id': 'bad id' } })
    expect(requestId(accepted)).toBe('request-1234')
    expect(requestId(rejected)).not.toBe('bad id')
  })

  it('limits one account without exhausting the shared IP allowance', async () => {
    const req = new NextRequest('http://localhost/api')
    for (let index = 0; index < 10; index++) expect((await enforceRateLimit(req, 'login', 'one@example.test')).ok).toBe(true)
    expect((await enforceRateLimit(req, 'login', 'one@example.test')).ok).toBe(false)
    expect((await enforceRateLimit(req, 'login', 'two@example.test')).ok).toBe(true)
  })
})
