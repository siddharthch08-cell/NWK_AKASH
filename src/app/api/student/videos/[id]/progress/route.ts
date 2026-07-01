import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, forbidden, fail } from '@/lib/api-response'
import { progressHeartbeatSchema } from '@/lib/validation'
import { getSettings } from '@/lib/settings'
import { youtubeThumb } from '@/lib/youtube'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/student/videos/[id]/progress
 * Returns video metadata + saved progress for the player to initialize.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const { id: videoId } = await params

  const video = await db.video.findUnique({
    where: { id: videoId },
    include: {
      topic: {
        include: {
          chapter: {
            include: {
              course: {
                include: { batches: true },
              },
            },
          },
        },
      },
    },
  })
  if (!video || video.status !== 'PUBLISHED') return notFound('Video not found')

  // Verify student has batch access
  const courseBatches = video.topic.chapter.course.batches
  if (courseBatches.length === 0) return forbidden('This video is not available in any of your batches')

  const hasAccess = await db.batchEnrollment.findFirst({
    where: {
      userId: ctx.user.id,
      batchId: { in: courseBatches.map((bc) => bc.batchId) },
    },
  })
  if (!hasAccess) return forbidden('You do not have access to this video')

  const settings = await getSettings()
  const progress = await db.videoProgress.findUnique({
    where: { userId_videoId: { userId: ctx.user.id, videoId } },
  })

  return ok(
    {
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        youtubeId: video.youtubeId,
        thumbnail: video.thumbnail || youtubeThumb(video.youtubeId),
        duration: video.duration,
      },
      progress: progress
        ? {
            position: progress.position,
            percent: progress.percent,
            completed: progress.completed,
            completedAt: progress.completedAt,
            lastWatchedAt: progress.lastWatchedAt,
          }
        : null,
      completionThreshold: settings.videoCompletionThreshold,
    },
    'Video detail + progress'
  )
}

/**
 * POST /api/student/videos/[id]/progress
 * Heartbeat — saves playback position, never reduces progress.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const { id: videoId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = progressHeartbeatSchema.safeParse({ videoId, ...(body as object) })
  if (!parsed.success) return fromZodError(parsed.error)

  // Clamp negative/invalid values
  const position = Math.max(0, Math.floor(parsed.data.position))
  const percent = Math.max(0, Math.min(100, parsed.data.percent))
  const duration = parsed.data.duration ? Math.max(0, Math.floor(parsed.data.duration)) : undefined

  const video = await db.video.findUnique({
    where: { id: videoId },
    include: {
      topic: {
        include: {
          chapter: {
            include: {
              course: { include: { batches: true } },
            },
          },
        },
      },
    },
  })
  if (!video || video.status !== 'PUBLISHED') return notFound('Video not found')

  // Verify batch access
  const courseBatches = video.topic.chapter.course.batches
  const hasAccess = await db.batchEnrollment.findFirst({
    where: {
      userId: ctx.user.id,
      batchId: { in: courseBatches.map((bc) => bc.batchId) },
    },
  })
  if (!hasAccess) return forbidden('You do not have access to this video')

  const settings = await getSettings()
  const threshold = settings.videoCompletionThreshold

  // Never reduce saved progress
  const existing = await db.videoProgress.findUnique({
    where: { userId_videoId: { userId: ctx.user.id, videoId } },
  })

  // Dedup: skip if position barely moved (< 5 seconds) and not a completion event
  const newPosition = Math.max(position, existing?.position || 0)
  const newPercent = Math.max(percent, existing?.percent || 0)
  const completed = (existing?.completed) || newPercent >= threshold

  const updated = await db.videoProgress.upsert({
    where: { userId_videoId: { userId: ctx.user.id, videoId } },
    create: {
      userId: ctx.user.id,
      videoId,
      position: newPosition,
      percent: newPercent,
      completed,
      completedAt: completed ? (existing?.completedAt || new Date()) : null,
      lastWatchedAt: new Date(),
    },
    update: {
      position: newPosition,
      percent: newPercent,
      completed,
      completedAt: completed ? (existing?.completedAt || new Date()) : null,
      lastWatchedAt: new Date(),
    },
  })

  return ok({ progress: updated }, 'Progress saved')
}
