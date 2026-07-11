import type { NextRequest } from 'next/server'
import { createClient, type RedisClientType } from 'redis'
import { getTrustedClientIp } from './request-security'

export interface RateLimitResult {
  ok: boolean
  retryAfterMs: number
  remaining: number
  limit: number
}

export interface RateLimitPolicy {
  windowMs: number
  ipMax: number
  identityMax?: number
}

export const RATE_LIMIT_POLICIES = {
  login: { windowMs: 60_000, ipMax: 60, identityMax: 10 },
  registration: { windowMs: 3_600_000, ipMax: 30, identityMax: 5 },
  refresh: { windowMs: 60_000, ipMax: 120, identityMax: 30 },
  passwordChange: { windowMs: 3_600_000, ipMax: 30, identityMax: 5 },
  approval: { windowMs: 60_000, ipMax: 120, identityMax: 30 },
  testStart: { windowMs: 60_000, ipMax: 120, identityMax: 15 },
  answerSave: { windowMs: 60_000, ipMax: 600, identityMax: 120 },
  videoHeartbeat: { windowMs: 60_000, ipMax: 600, identityMax: 60 },
  export: { windowMs: 60_000, ipMax: 60, identityMax: 10 },
  contact: { windowMs: 3_600_000, ipMax: 20, identityMax: 5 },
} satisfies Record<string, RateLimitPolicy>

type Bucket = { count: number; resetAt: number }
const memoryBuckets = new Map<string, Bucket>()
let redisClient: RedisClientType | null = null
let redisConnecting: Promise<RedisClientType> | null = null

async function redis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL
  if (!url) {
    if (process.env.NODE_ENV === 'production') throw new Error('REDIS_URL is required for production rate limiting')
    return null
  }
  if (redisClient?.isReady) return redisClient
  if (!redisConnecting) {
    const client = createClient({ url })
    client.on('error', error => console.error('[rate-limit] Redis error', error instanceof Error ? error.message : 'unknown'))
    redisConnecting = client.connect().then(() => {
      redisClient = client as RedisClientType
      return redisClient
    }).finally(() => { redisConnecting = null })
  }
  return redisConnecting
}

async function increment(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  const client = await redis()
  let count: number
  let ttl: number
  if (client) {
    const result = await client.eval(
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('PTTL',KEYS[1])}",
      { keys: [`edulearn:rl:${key}`], arguments: [String(windowMs)] },
    ) as [number, number]
    count = Number(result[0])
    ttl = Math.max(0, Number(result[1]))
  } else {
    const now = Date.now()
    const existing = memoryBuckets.get(key)
    const bucket = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + windowMs } : existing
    bucket.count++
    memoryBuckets.set(key, bucket)
    count = bucket.count
    ttl = Math.max(0, bucket.resetAt - now)
  }
  return { ok: count <= max, retryAfterMs: count <= max ? 0 : ttl, remaining: Math.max(0, max - count), limit: max }
}

export async function enforceRateLimit(req: NextRequest, endpoint: keyof typeof RATE_LIMIT_POLICIES, identity?: string): Promise<RateLimitResult> {
  const policy = RATE_LIMIT_POLICIES[endpoint]
  const ip = getTrustedClientIp(req)
  const ipResult = await increment(`${endpoint}:ip:${ip}`, policy.ipMax, policy.windowMs)
  if (!ipResult.ok || !identity || !policy.identityMax) return ipResult
  const normalized = identity.trim().toLowerCase().slice(0, 200)
  const identityResult = await increment(`${endpoint}:identity:${normalized}`, policy.identityMax, policy.windowMs)
  return identityResult.ok ? { ...identityResult, remaining: Math.min(ipResult.remaining, identityResult.remaining) } : identityResult
}

export function resetMemoryRateLimitsForTests() {
  memoryBuckets.clear()
}
