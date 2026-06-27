import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, fail, parsePagination } from '@/lib/api-response'
import { announcementSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const p = parsePagination(req)
  const where: Prisma.AnnouncementWhereInput = {}
  if (p.search) {
    where.OR = [{ title: { contains: p.search } }, { message: { contains: p.search } }]
  }
  if (p.status) where.status = String(p.status)
  if (p.audience) where.audience = String(p.audience)

  const [total, items] = await Promise.all([
    db.announcement.count({ where }),
    db.announcement.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { publishAt: 'desc' }],
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      include: {
        creator: { select: { name: true } },
        batches: { include: { batch: { select: { id: true, name: true } } } },
      },
    }),
  ])

  return ok(
    {
      items,
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
    },
    'Announcements list'
  )
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = announcementSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  if (parsed.data.audience === 'BATCH' && (!parsed.data.batchIds || parsed.data.batchIds.length === 0)) {
    return fail('VALIDATION_ERROR', 'batchIds is required for BATCH audience', 400, { batchIds: 'Required for BATCH audience' })
  }

  if (parsed.data.publishAt && parsed.data.expireAt && new Date(parsed.data.publishAt) > new Date(parsed.data.expireAt)) {
    return fail('VALIDATION_ERROR', 'Expiry must be after publish time', 400, { expireAt: 'Must be after publishAt' })
  }

  const ann = await db.announcement.create({
    data: {
      title: parsed.data.title,
      message: parsed.data.message,
      audience: parsed.data.audience,
      priority: parsed.data.priority,
      pinned: parsed.data.pinned,
      status: parsed.data.status,
      publishAt: parsed.data.publishAt ? new Date(parsed.data.publishAt) : new Date(),
      expireAt: parsed.data.expireAt ? new Date(parsed.data.expireAt) : null,
      createdBy: ctx.user.id,
      batches: parsed.data.batchIds?.length
        ? { create: parsed.data.batchIds.map((batchId) => ({ batchId })) }
        : undefined,
    },
    include: { batches: true },
  })
  if (ann.status === 'PUBLISHED') {
    await audit({ ctx, action: 'ANNOUNCEMENT_PUBLISHED', entityType: 'ANNOUNCEMENT', entityId: ann.id, after: { title: ann.title } })
  }

  return ok({ announcement: ann }, 'Announcement created', undefined, 201)
}
