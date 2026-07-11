import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail, fromZodError } from '@/lib/api-response'
import { z } from 'zod'
import { BatchCourseService } from '@/domain'
import { DomainError } from '@/domain/errors'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/courses/[id]/batches
 * Returns assignable batches plus every currently assigned hidden/history batch.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const course = await db.course.findUnique({ where: { id } })
  if (!course) return notFound('Course not found')

  const visibleBatches = await db.batch.findMany({
    where: { OR: [{ status: { in: ['UPCOMING', 'ACTIVE'] } }, { courses: { some: { courseId: id } } }] },
    select: {
      id: true, name: true, slug: true, description: true, status: true,
      startDate: true, endDate: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { name: 'asc' },
  })

  // Get current assignments for this course
  const assignedBatchIds = await db.batchCourse.findMany({
    where: { courseId: id },
    select: { batchId: true },
  })
  const assignedSet = new Set(assignedBatchIds.map((a) => a.batchId))

  const batches = visibleBatches.map((b) => ({
    ...b,
    enrolledCount: b._count.enrollments,
    assigned: assignedSet.has(b.id),
    editable: b.status === 'UPCOMING' || b.status === 'ACTIVE',
    _count: undefined,
  }))

  return ok({ batches }, 'Assignable and historically assigned batches')
}

const syncSchema = z.object({
  batchIds: z.array(z.string()),
})

/**
 * PUT /api/admin/courses/[id]/batches
 * Synchronizes batch assignments for this course.
 * Uses BatchCourseService for transactional sync with audit.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = syncSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  try {
    const result = await BatchCourseService.syncCourseBatches(
      id,
      parsed.data.batchIds,
      { userId: ctx.user.id, role: ctx.user.role, name: ctx.user.name, email: ctx.user.email, status: ctx.user.status, ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId },
    )
    return ok(result, `Synced batch assignments (+${result.added} -${result.removed})`)
  } catch (e) {
    if (e instanceof DomainError) {
      return fail(e.code, e.message, e.status, e.fields)
    }
    throw e
  }
}
