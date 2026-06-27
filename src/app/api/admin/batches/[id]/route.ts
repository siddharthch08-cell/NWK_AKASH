import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { batchSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { slugify } from '@/lib/format'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const batch = await db.batch.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, email: true } },
      _count: { select: { enrollments: true, courses: true, tests: true, materials: true, announcements: true } },
      courses: { include: { course: { select: { id: true, title: true, slug: true, status: true, thumbnail: true } } } },
      tests: { include: { test: { select: { id: true, title: true, status: true, durationMins: true } } } },
      enrollments: {
        take: 100,
        include: { user: { select: { id: true, name: true, email: true, status: true } } },
        orderBy: { enrolledAt: 'desc' },
      },
    },
  })
  if (!batch) return notFound('Batch not found')

  return ok({ batch }, 'Batch detail')
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
  const parsed = batchSchema.partial().safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const existing = await db.batch.findUnique({ where: { id } })
  if (!existing) return notFound('Batch not found')

  const data: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.slug !== undefined) {
    const slug = parsed.data.slug || slugify(parsed.data.name || existing.name)
    if (slug !== existing.slug) {
      const dup = await db.batch.findUnique({ where: { slug } })
      if (dup) return fail('CONFLICT', 'Slug already in use', 409, { slug: 'Already in use' })
      data.slug = slug
    }
  }
  if (parsed.data.description !== undefined) data.description = parsed.data.description || null
  if (parsed.data.thumbnail !== undefined) data.thumbnail = parsed.data.thumbnail || null
  if (parsed.data.startDate !== undefined) data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null
  if (parsed.data.endDate !== undefined) data.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null
  if (parsed.data.status !== undefined) data.status = parsed.data.status
  if (parsed.data.capacity !== undefined) data.capacity = parsed.data.capacity || null

  if (data.startDate && data.endDate && new Date(data.startDate as string) > new Date(data.endDate as string)) {
    return fail('VALIDATION_ERROR', 'End date must be after start date', 400, { endDate: 'Must be after start date' })
  }

  const updated = await db.batch.update({ where: { id }, data })
  await audit({ ctx, action: 'BATCH_UPDATED', entityType: 'BATCH', entityId: id, before: existing, after: updated })
  return ok({ batch: updated }, 'Batch updated')
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const batch = await db.batch.findUnique({ where: { id } })
  if (!batch) return notFound('Batch not found')

  const updated = await db.batch.update({ where: { id }, data: { status: 'ARCHIVED' } })
  await audit({ ctx, action: 'BATCH_ARCHIVED', entityType: 'BATCH', entityId: id, before: { status: batch.status }, after: { status: 'ARCHIVED' } })
  return ok({ batch: updated }, 'Batch archived')
}
