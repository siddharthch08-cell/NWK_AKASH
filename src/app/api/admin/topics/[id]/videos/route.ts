import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { videoSchema } from '@/lib/validation'
import { extractYouTubeId, youtubeThumb } from '@/lib/youtube'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const topic = await db.topic.findUnique({
    where: { id },
    include: { videos: { orderBy: { order: 'asc' } } },
  })
  if (!topic) return notFound('Topic not found')
  return ok({ videos: topic.videos }, 'Videos list')
}

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = videoSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const topic = await db.topic.findUnique({ where: { id } })
  if (!topic) return notFound('Topic not found')

  // Resolve YouTube ID — accept either youtubeUrl or youtubeId
  let youtubeId: string | null = parsed.data.youtubeId || null
  if (!youtubeId && parsed.data.youtubeUrl) {
    youtubeId = extractYouTubeId(parsed.data.youtubeUrl)
  }
  if (!youtubeId) {
    return fail('VALIDATION_ERROR', 'A valid YouTube URL or 11-character video ID is required', 400, {
      youtubeUrl: 'Must be a valid YouTube URL or video ID',
    })
  }

  const maxOrder = await db.video.aggregate({ where: { topicId: id }, _max: { order: true } })
  const order = parsed.data.order ?? (maxOrder._max.order ?? -1) + 1
  const status = parsed.data.status || 'DRAFT'
  const publishedAt = status === 'PUBLISHED' ? new Date() : null

  const video = await db.video.create({
    data: {
      topicId: id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      youtubeId,
      thumbnail: parsed.data.thumbnail || youtubeThumb(youtubeId),
      duration: parsed.data.duration || null,
      order,
      status,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      publishedAt,
      createdBy: ctx.user.id,
    } as any,
  })
  await audit({ ctx, action: 'VIDEO_CREATED', entityType: 'VIDEO', entityId: video.id, after: { title: video.title, youtubeId } })
  return ok({ video }, 'Video created', undefined, 201)
}
