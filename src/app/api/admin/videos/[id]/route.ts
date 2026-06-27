import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { videoSchema } from '@/lib/validation'
import { extractYouTubeId, youtubeThumb } from '@/lib/youtube'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = videoSchema.partial().safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const existing = await db.video.findUnique({ where: { id } })
  if (!existing) return notFound('Video not found')

  const data: Record<string, unknown> = {}
  if (parsed.data.title !== undefined) data.title = parsed.data.title
  if (parsed.data.description !== undefined) data.description = parsed.data.description || null
  if (parsed.data.duration !== undefined) data.duration = parsed.data.duration
  if (parsed.data.order !== undefined) data.order = parsed.data.order
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status
    if (parsed.data.status === 'PUBLISHED' && !existing.publishedAt) {
      data.publishedAt = new Date()
    }
  }
  if (parsed.data.scheduledAt !== undefined) {
    data.scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null
  }
  // Resolve youtubeId from either field
  if (parsed.data.youtubeId !== undefined || parsed.data.youtubeUrl !== undefined) {
    let youtubeId = parsed.data.youtubeId
    if (!youtubeId && parsed.data.youtubeUrl) {
      youtubeId = extractYouTubeId(parsed.data.youtubeUrl)
    }
    if (!youtubeId) {
      return fail('VALIDATION_ERROR', 'Invalid YouTube URL or ID', 400, { youtubeUrl: 'Must be valid YouTube URL or 11-char ID' })
    }
    data.youtubeId = youtubeId
    if (!parsed.data.thumbnail) data.thumbnail = youtubeThumb(youtubeId)
  }
  if (parsed.data.thumbnail !== undefined) data.thumbnail = parsed.data.thumbnail || null

  const updated = await db.video.update({ where: { id }, data })
  return ok({ video: updated }, 'Video updated')
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const existing = await db.video.findUnique({ where: { id } })
  if (!existing) return notFound('Video not found')
  await db.video.delete({ where: { id } })
  return ok({}, 'Video deleted')
}
