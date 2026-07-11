import { NextRequest } from 'next/server'
import { requireActiveStudent } from '@/lib/auth'
import { ok, fromZodError, unauthorized, fail, tooMany } from '@/lib/api-response'
import { progressHeartbeatSchema } from '@/lib/validation'
import { VideoProgressService } from '@/domain'
import { DomainError } from '@/domain/errors'
import { enforceRateLimit } from '@/lib/rate-limit'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/student/videos/[id]/progress
 * Returns video metadata + saved progress for the player to initialize.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const { id: videoId } = await params

  try {
    const result = await VideoProgressService.getVideoProgress(ctx.user.id, videoId)
    return ok(result, 'Video detail + progress')
  } catch (e) {
    if (e instanceof DomainError) {
      return fail(e.code, e.message, e.status, e.fields)
    }
    throw e
  }
}

/**
 * POST /api/student/videos/[id]/progress
 * Heartbeat — saves playback position, never reduces progress.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const limit = await enforceRateLimit(req, 'videoHeartbeat', ctx.user.id)
  if (!limit.ok) return tooMany('Too many video progress updates.', limit.retryAfterMs, ctx.requestId)
  const { id: videoId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = progressHeartbeatSchema.safeParse({ videoId, ...(body as object) })
  if (!parsed.success) return fromZodError(parsed.error)

  try {
    const progress = await VideoProgressService.saveVideoProgress(
      ctx.user.id,
      videoId,
      parsed.data.position,
      parsed.data.percent,
      parsed.data.duration,
      parsed.data.sessionId,
    )
    return ok({ progress }, 'Progress saved')
  } catch (e) {
    if (e instanceof DomainError) {
      return fail(e.code, e.message, e.status, e.fields)
    }
    throw e
  }
}
