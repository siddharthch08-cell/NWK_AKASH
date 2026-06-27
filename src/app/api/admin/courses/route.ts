import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, fail, conflict, notFound, parsePagination } from '@/lib/api-response'
import { courseSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { slugify } from '@/lib/format'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const p = parsePagination(req)
  const where: Prisma.CourseWhereInput = {}
  if (p.search) {
    where.OR = [
      { title: { contains: p.search } },
      { slug: { contains: p.search } },
      { category: { contains: p.search } },
    ]
  }
  if (p.status) where.status = String(p.status)
  if (p.batchId) where.batches = { some: { batchId: String(p.batchId) } }

  const [total, items] = await Promise.all([
    db.course.count({ where }),
    db.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      include: {
        _count: { select: { chapters: true, batches: true } },
        creator: { select: { name: true } },
      },
    }),
  ])

  return ok(
    {
      items: items.map((c) => ({
        ...c,
        chapterCount: c._count.chapters,
        batchCount: c._count.batches,
        _count: undefined,
      })),
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
    },
    'Courses list'
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
  const parsed = courseSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const slug = parsed.data.slug || slugify(parsed.data.title)
  const existing = await db.course.findUnique({ where: { slug } })
  if (existing) return conflict('Course slug already exists')

  const course = await db.course.create({
    data: {
      title: parsed.data.title,
      slug,
      description: parsed.data.description || null,
      thumbnail: parsed.data.thumbnail || null,
      category: parsed.data.category || null,
      status: parsed.data.status || 'DRAFT',
      createdBy: ctx.user.id,
      batches: parsed.data.batchIds?.length
        ? { create: parsed.data.batchIds.map((batchId) => ({ batchId })) }
        : undefined,
    },
    include: { batches: true },
  })
  await audit({ ctx, action: 'COURSE_CREATED', entityType: 'COURSE', entityId: course.id, after: { title: course.title, slug: course.slug } })

  return ok({ course }, 'Course created', undefined, 201)
}
