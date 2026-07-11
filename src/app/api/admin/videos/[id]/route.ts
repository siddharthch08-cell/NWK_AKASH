import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { videoSchema } from '@/lib/validation'
import { extractYouTubeId, youtubeThumb } from '@/lib/youtube'
import { audit } from '@/lib/audit'
import { ContentLifecycleService, DomainError } from '@/domain'

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
  if ((body as { restore?: boolean }).restore === true) {
    try {
      const video = await ContentLifecycleService.restoreVideo(id, { userId: ctx.user.id, role: ctx.user.role, name: ctx.user.name, email: ctx.user.email, status: ctx.user.status, ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId })
      return ok({ video }, 'Video restored')
    } catch (error) { if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields); throw error }
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
  if (parsed.data.youtubeId !== undefined || parsed.data.youtubeUrl !== undefined) {
    let youtubeId: string | null = parsed.data.youtubeId || null
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

  const updated = await db.video.update({ where: { id }, data: data as any })
  return ok({ video: updated }, 'Video updated')
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const domainCtx = { userId: ctx.user.id, role: ctx.user.role, name: ctx.user.name, email: ctx.user.email, status: ctx.user.status, ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId }
  try {
    const permanent = new URL(req.url).searchParams.get('permanent') === 'true'
    const result = permanent ? await ContentLifecycleService.deleteVideo(id, domainCtx) : await ContentLifecycleService.archiveVideo(id, domainCtx)
    return ok({ video: permanent ? undefined : result }, permanent ? 'Video deleted' : 'Video archived')
  } catch (error) {
    if (error instanceof DomainError) {
      await audit({ ctx, action: 'VIDEO_DELETE_FAILED', entityType: 'VIDEO', entityId: id, outcome: 'DENIED', after: { code: error.code } })
      return fail(error.code, error.message, error.status, error.fields, ctx.requestId)
    }
    throw error
  }
}
