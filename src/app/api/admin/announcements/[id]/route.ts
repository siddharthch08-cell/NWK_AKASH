import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { announcementSchema } from '@/lib/validation'
import { DomainError } from '@/domain'
import { audit } from '@/lib/audit'
import { assertDateRange, parseApiDate } from '@/domain/shared/date'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const ann = await db.announcement.findUnique({
    where: { id },
    include: { creator: { select: { name: true } }, batches: { include: { batch: true } } },
  })
  if (!ann) return notFound('Announcement not found')
  return ok({ announcement: ann }, 'Announcement detail')
}

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
  const parsed = announcementSchema.partial().safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const existing = await db.announcement.findUnique({ where: { id } })
  if (!existing) return notFound('Announcement not found')

  const data: Record<string, unknown> = {}
  for (const key of ['title', 'message', 'audience', 'priority', 'pinned', 'status'] as const) {
    if (parsed.data[key] !== undefined) data[key] = parsed.data[key]
  }
  try {
    const finalPublish = parsed.data.publishAt !== undefined ? parseApiDate(parsed.data.publishAt, 'publishAt') || new Date() : existing.publishAt
    const finalExpire = parsed.data.expireAt !== undefined ? parseApiDate(parsed.data.expireAt, 'expireAt') : existing.expireAt
    assertDateRange(finalPublish, finalExpire, 'publishAt', 'expireAt')
    if (parsed.data.publishAt !== undefined) data.publishAt = finalPublish
    if (parsed.data.expireAt !== undefined) data.expireAt = finalExpire
  } catch (error) { if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields); throw error }

  const updated = await db.$transaction(async tx => {
    const result = await tx.announcement.update({ where: { id }, data })
    if (parsed.data.batchIds !== undefined) {
      await tx.announcementBatch.deleteMany({ where: { announcementId: id } })
      for (const batchId of new Set(parsed.data.batchIds)) await tx.announcementBatch.create({ data: { announcementId: id, batchId } })
    }
    return result
  })

  await audit({ ctx, action: 'BATCH_UPDATED', entityType: 'ANNOUNCEMENT', entityId: id, after: { title: updated.title, status: updated.status } })
  return ok({ announcement: updated }, 'Announcement updated')
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const existing = await db.announcement.findUnique({ where: { id } })
  if (!existing) return notFound('Announcement not found')
  await db.announcement.update({ where: { id }, data: { status: 'ARCHIVED' } })
  await audit({ ctx, action: 'BATCH_ARCHIVED', entityType: 'ANNOUNCEMENT', entityId: id, before: { title: existing.title, status: existing.status }, after: { status: 'ARCHIVED' } })
  return ok({}, 'Announcement archived')
}
