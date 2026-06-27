import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { announcementSchema } from '@/lib/validation'

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
  if (parsed.data.publishAt !== undefined) data.publishAt = parsed.data.publishAt ? new Date(parsed.data.publishAt) : new Date()
  if (parsed.data.expireAt !== undefined) data.expireAt = parsed.data.expireAt ? new Date(parsed.data.expireAt) : null

  const updated = await db.announcement.update({ where: { id }, data })

  // Update batch assignments if provided
  if (parsed.data.batchIds !== undefined) {
    await db.announcementBatch.deleteMany({ where: { announcementId: id } })
    if (parsed.data.batchIds.length > 0) {
      await db.announcementBatch.createMany({
        data: parsed.data.batchIds.map((batchId) => ({ announcementId: id, batchId })),
      })
    }
  }

  return ok({ announcement: updated }, 'Announcement updated')
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const existing = await db.announcement.findUnique({ where: { id } })
  if (!existing) return notFound('Announcement not found')
  await db.announcement.update({ where: { id }, data: { status: 'ARCHIVED' } })
  return ok({}, 'Announcement archived')
}
