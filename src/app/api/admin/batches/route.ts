import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, fail, conflict, parsePagination } from '@/lib/api-response'
import { batchSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { slugify } from '@/lib/format'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const p = parsePagination(req)
  const where: Prisma.BatchWhereInput = {}
  if (p.search) {
    where.OR = [
      { name: { contains: p.search } },
      { slug: { contains: p.search } },
      { description: { contains: p.search } },
    ]
  }
  if (p.status) where.status = String(p.status)

  const [total, items] = await Promise.all([
    db.batch.count({ where }),
    db.batch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      include: {
        _count: { select: { enrollments: true, courses: true, tests: true } },
        creator: { select: { name: true } },
      },
    }),
  ])

  return ok(
    {
      items: items.map((b) => ({
        ...b,
        enrolledCount: b._count.enrollments,
        courseCount: b._count.courses,
        testCount: b._count.tests,
        _count: undefined,
      })),
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
    },
    'Batches list'
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
  const parsed = batchSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const slug = parsed.data.slug || slugify(parsed.data.name)
  const existing = await db.batch.findUnique({ where: { slug } })
  if (existing) return conflict('A batch with this slug already exists')

  if (parsed.data.startDate && parsed.data.endDate) {
    if (new Date(parsed.data.startDate) > new Date(parsed.data.endDate)) {
      return fail('VALIDATION_ERROR', 'End date must be after start date', 400, { endDate: 'Must be after start date' })
    }
  }

  const batch = await db.batch.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      thumbnail: parsed.data.thumbnail || null,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      status: parsed.data.status || 'DRAFT',
      capacity: parsed.data.capacity || null,
      createdBy: ctx.user.id,
    },
  })
  await audit({ ctx, action: 'BATCH_CREATED', entityType: 'BATCH', entityId: batch.id, after: { name: batch.name, slug: batch.slug } })

  return ok({ batch }, 'Batch created', undefined, 201)
}
