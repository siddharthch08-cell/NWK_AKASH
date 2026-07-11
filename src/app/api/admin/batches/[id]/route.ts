import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { batchSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { slugify } from '@/lib/format'
import { EnrollmentService } from '@/domain'
import { DomainError } from '@/domain'
import { assertDateRange, parseApiDate } from '@/domain/shared/date'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20))
  const search = url.searchParams.get('search') || undefined

  const batch = await db.batch.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, email: true } },
      _count: { select: { enrollments: true, courses: true, tests: true, announcements: true } },
      courses: { include: { course: { select: { id: true, title: true, slug: true, status: true, thumbnail: true } } } },
      tests: { include: { test: { select: { id: true, title: true, status: true, durationMins: true } } } },
    },
  })
  if (!batch) return notFound('Batch not found')

  const enrollmentPage = await EnrollmentService.getBatchEnrollments(id, page, pageSize, search)
  const publishedCourseMaterials = await db.material.count({
    where: { published: true, archived: false, course: { status: 'PUBLISHED', batches: { some: { batchId: id } } }, chapter: { archivedAt: null }, OR: [{ topicId: null }, { topic: { archivedAt: null } }] },
  })
  return ok({ batch: { ...batch, enrollments: enrollmentPage.items, enrollmentPagination: { page: enrollmentPage.page, pageSize: enrollmentPage.pageSize, total: enrollmentPage.total, totalPages: enrollmentPage.totalPages }, _count: { ...batch._count, publishedCourseMaterials } } }, 'Batch detail')
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
  try {
    const finalStart = parsed.data.startDate !== undefined ? parseApiDate(parsed.data.startDate, 'startDate') : existing.startDate
    const finalEnd = parsed.data.endDate !== undefined ? parseApiDate(parsed.data.endDate, 'endDate') : existing.endDate
    assertDateRange(finalStart, finalEnd, 'startDate', 'endDate')
    if (parsed.data.startDate !== undefined) data.startDate = finalStart
    if (parsed.data.endDate !== undefined) data.endDate = finalEnd
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields)
    throw error
  }
  if (parsed.data.status !== undefined) data.status = parsed.data.status
  if (parsed.data.capacity !== undefined) data.capacity = parsed.data.capacity || null

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

  const url = new URL(req.url)
  const permanent = url.searchParams.get('permanent') === 'true'

  if (permanent) {
    // Check for protected dependencies before permanent deletion
    const [enrollments, courseAssignments, testAssignments, announcements] = await Promise.all([
      db.batchEnrollment.count({ where: { batchId: id } }),
      db.batchCourse.count({ where: { batchId: id } }),
      db.testBatch.count({ where: { batchId: id } }),
      db.announcementBatch.count({ where: { batchId: id } }),
    ])

    const totalDeps = enrollments + courseAssignments + testAssignments + announcements
    if (totalDeps > 0) {
      await audit({ ctx, action: 'BATCH_DELETE_FAILED', entityType: 'BATCH', entityId: id, outcome: 'DENIED', after: { dependencyCount: totalDeps } })
      return fail('CONFLICT', 'Cannot delete batch with dependencies. Archive instead.', 409, {
        enrollments: String(enrollments),
        courseAssignments: String(courseAssignments),
        testAssignments: String(testAssignments),
        announcements: String(announcements),
        total: String(totalDeps),
      }, ctx.requestId)
    }

    // Safe to permanently delete — no dependencies
    await db.batch.delete({ where: { id } })
    await audit({ ctx, action: 'BATCH_DELETED', entityType: 'BATCH', entityId: id, before: { name: batch.name } })
    return ok({}, 'Batch permanently deleted')
  }

  // Archive by default (soft delete)
  const updated = await db.batch.update({ where: { id }, data: { status: 'ARCHIVED' } })
  await audit({ ctx, action: 'BATCH_ARCHIVED', entityType: 'BATCH', entityId: id, before: { status: batch.status }, after: { status: 'ARCHIVED' } })
  return ok({ batch: updated }, 'Batch archived')
}
