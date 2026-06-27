import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { courseSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { slugify } from '@/lib/format'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const course = await db.course.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, email: true } },
      chapters: {
        orderBy: { order: 'asc' },
        include: {
          topics: {
            orderBy: { order: 'asc' },
            include: {
              videos: {
                orderBy: { order: 'asc' },
                select: { id: true, title: true, youtubeId: true, status: true, order: true, duration: true },
              },
            },
          },
        },
      },
      batches: { include: { batch: { select: { id: true, name: true, slug: true, status: true } } } },
    },
  })
  if (!course) return notFound('Course not found')
  return ok({ course }, 'Course detail')
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
  const parsed = courseSchema.partial().safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const existing = await db.course.findUnique({ where: { id } })
  if (!existing) return notFound('Course not found')

  const data: Record<string, unknown> = {}
  if (parsed.data.title !== undefined) data.title = parsed.data.title
  if (parsed.data.slug !== undefined) {
    const slug = parsed.data.slug || slugify(parsed.data.title || existing.title)
    if (slug !== existing.slug) {
      const dup = await db.course.findUnique({ where: { slug } })
      if (dup) return fail('CONFLICT', 'Slug already in use', 409, { slug: 'Already in use' })
      data.slug = slug
    }
  }
  if (parsed.data.description !== undefined) data.description = parsed.data.description || null
  if (parsed.data.thumbnail !== undefined) data.thumbnail = parsed.data.thumbnail || null
  if (parsed.data.category !== undefined) data.category = parsed.data.category || null
  if (parsed.data.status !== undefined) data.status = parsed.data.status

  const updated = await db.course.update({ where: { id }, data })
  await audit({ ctx, action: 'COURSE_UPDATED', entityType: 'COURSE', entityId: id, before: existing, after: updated })
  return ok({ course: updated }, 'Course updated')
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const course = await db.course.findUnique({ where: { id } })
  if (!course) return notFound('Course not found')

  const updated = await db.course.update({ where: { id }, data: { status: 'ARCHIVED' } })
  await audit({ ctx, action: 'COURSE_ARCHIVED', entityType: 'COURSE', entityId: id, before: { status: course.status }, after: { status: 'ARCHIVED' } })
  return ok({ course: updated }, 'Course archived')
}
