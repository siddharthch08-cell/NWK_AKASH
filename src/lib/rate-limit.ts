import { createHash } from 'node:crypto'
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
let redisConnecting: Promise<RedisClientType | null> | null = null

const INCREMENT_POLICY_SCRIPT = `
local ipCount = redis.call('INCR', KEYS[1])
if ipCount == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ipTtl = redis.call('PTTL', KEYS[1])
if ipCount > tonumber(ARGV[2]) or #KEYS == 1 then
  return {ipCount, ipTtl, -1, -1}
end
local identityCount = redis.call('INCR', KEYS[2])
if identityCount == 1 then redis.call('PEXPIRE', KEYS[2], ARGV[1]) end
return {ipCount, ipTtl, identityCount, redis.call('PTTL', KEYS[2])}
`

async function redis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL
  if (!url) return null
  if (redisClient?.isReady) return redisClient
  if (!redisConnecting) {
    const client = createClient({ url })
    client.on('error', error => {
      const metadata = error && typeof error === 'object' ? error as { name?: unknown; code?: unknown } : null
      console.error('[rate-limit] Redis error', {
        name: typeof metadata?.name === 'string' ? metadata.name : 'UnknownError',
        code: typeof metadata?.code === 'string' ? metadata.code : undefined,
      })
      redisClient = null
      redisConnecting = null
    })
    redisConnecting = client.connect().then(() => {
      redisClient = client as RedisClientType
      return redisClient as RedisClientType | null
    }).catch((): null => null).finally(() => { redisConnecting = null })
  }
  return redisConnecting
}

function resultFor(count: number, max: number, ttl: number): RateLimitResult {
  const ok = count <= max
  return {
    ok,
    retryAfterMs: ok ? 0 : Math.max(0, ttl),
    remaining: Math.max(0, max - count),
    limit: max,
  }
}

function incrementMemory(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const existing = memoryBuckets.get(key)
  const bucket = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + windowMs } : existing
  bucket.count += 1
  memoryBuckets.set(key, bucket)
  return resultFor(bucket.count, max, bucket.resetAt - now)
}

function identityKey(identity: string): string {
  const normalized = identity.trim().toLowerCase().slice(0, 200)
  return createHash('sha256').update(normalized, 'utf8').digest('hex').slice(0, 32)
}

export async function enforceRateLimit(
  req: NextRequest,
  endpoint: keyof typeof RATE_LIMIT_POLICIES,
  identity?: string,
): Promise<RateLimitResult> {
  const policy = RATE_LIMIT_POLICIES[endpoint]
  const ipKey = `${endpoint}:ip:${getTrustedClientIp(req)}`
  const canLimitIdentity = !!identity && !!policy.identityMax
  const accountKey = canLimitIdentity ? `${endpoint}:identity:${identityKey(identity)}` : null
  const client = await redis()

  if (client) {
    const keys = [`edulearn:rl:${ipKey}`]
    if (accountKey) keys.push(`edulearn:rl:${accountKey}`)
    const counters = await client.eval(INCREMENT_POLICY_SCRIPT, {
      keys,
      arguments: [String(policy.windowMs), String(policy.ipMax)],
    }) as [number, number, number, number]
    const ipResult = resultFor(Number(counters[0]), policy.ipMax, Number(counters[1]))
    if (!ipResult.ok || !accountKey || !policy.identityMax || Number(counters[2]) < 0) return ipResult
    const accountResult = resultFor(Number(counters[2]), policy.identityMax, Number(counters[3]))
    return accountResult.ok
      ? { ...accountResult, remaining: Math.min(ipResult.remaining, accountResult.remaining) }
      : accountResult
  }

  const ipResult = incrementMemory(ipKey, policy.ipMax, policy.windowMs)
  if (!ipResult.ok || !accountKey || !policy.identityMax) return ipResult
  const accountResult = incrementMemory(accountKey, policy.identityMax, policy.windowMs)
  return accountResult.ok
    ? { ...accountResult, remaining: Math.min(ipResult.remaining, accountResult.remaining) }
    : accountResult
}

export function resetMemoryRateLimitsForTests() {
  memoryBuckets.clear()
}