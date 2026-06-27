/**
 * Simple in-memory sliding-window rate limiter (single-instance, dev-only).
 * For production, replace with Redis-backed limiter per the architecture spec.
 */

interface Bucket {
  timestamps: number[]
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  ok: boolean
  retryAfterMs: number
  remaining: number
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key) || { timestamps: [] }
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs)
  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0]
    return { ok: false, retryAfterMs: windowMs - (now - oldest), remaining: 0 }
  }
  bucket.timestamps.push(now)
  buckets.set(key, bucket)
  return { ok: true, retryAfterMs: 0, remaining: maxRequests - bucket.timestamps.length }
}

// Periodically purge expired buckets to avoid memory growth
setInterval(() => {
  const now = Date.now()
  for (const [k, b] of buckets) {
    b.timestamps = b.timestamps.filter((t) => now - t < 60 * 60 * 1000)
    if (b.timestamps.length === 0) buckets.delete(k)
  }
}, 5 * 60 * 1000).unref?.()
