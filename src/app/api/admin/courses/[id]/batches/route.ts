import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail, fromZodError } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/courses/[id]/batches
 * Returns all ACTIVE batches with their assignment status for this course.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const course = await db.course.findUnique({ where: { id } })
  if (!course) return notFound('Course not found')

  // Get all ACTIVE batches
  const activeBatches = await db.batch.findMany({
    where: { status: 'ACTIVE' },
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

  const batches = activeBatches.map((b) => ({
    ...b,
    enrolledCount: b._count.enrollments,
    assigned: assignedSet.has(b.id),
    _count: undefined,
  }))

  return ok({ batches }, 'Active batches with assignment status')
}

const syncSchema = z.object({
  batchIds: z.array(z.string()),
})

/**
 * PUT /api/admin/courses/[id]/batches
 * Synchronizes batch assignments for this course.
 * Adds new assignments and removes ones not in the list — all in one transaction.
 * Only ACTIVE batches are allowed.
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

  const course = await db.course.findUnique({ where: { id } })
  if (!course) return notFound('Course not found')

  // Validate all batches exist and are ACTIVE
  if (parsed.data.batchIds.length > 0) {
    const batches = await db.batch.findMany({
      where: { id: { in: parsed.data.batchIds } },
      select: { id: true, status: true, name: true },
    })
    if (batches.length !== parsed.data.batchIds.length) {
      return fail('NOT_FOUND', 'One or more batches not found', 404)
    }
    const inactive = batches.filter((b) => b.status !== 'ACTIVE')
    if (inactive.length > 0) {
      return fail('VALIDATION_ERROR', `Cannot assign to non-active batches: ${inactive.map((b) => b.name).join(', ')}`, 422, {
        batchIds: 'All batches must be ACTIVE',
      })
    }
  }

  // Get current assignments
  const current = await db.batchCourse.findMany({
    where: { courseId: id },
    select: { batchId: true },
  })
  const currentSet = new Set(current.map((c) => c.batchId))
  const newSet = new Set(parsed.data.batchIds)

  const toAdd = [...newSet].filter((bid) => !currentSet.has(bid))
  const toRemove = [...currentSet].filter((bid) => !newSet.has(bid))

  // Synchronize in transaction
  await db.$transaction(async (tx) => {
    if (toRemove.length > 0) {
      await tx.batchCourse.deleteMany({
        where: { courseId: id, batchId: { in: toRemove } },
      })
    }
    if (toAdd.length > 0) {
      for (const batchId of toAdd) {
        await tx.batchCourse.create({ data: { courseId: id, batchId } })
      }
    }
  })

  // Audit
  if (toAdd.length > 0) {
    await audit({ ctx, action: 'COURSE_ASSIGNED_TO_BATCH', entityType: 'COURSE', entityId: id, after: { added: toAdd } })
  }
  if (toRemove.length > 0) {
    await audit({ ctx, action: 'COURSE_UNASSIGNED_FROM_BATCH', entityType: 'COURSE', entityId: id, before: { removed: toRemove } })
  }

  return ok({ added: toAdd.length, removed: toRemove.length, totalAssigned: newSet.size }, `Synced batch assignments (+${toAdd.length} -${toRemove.length})`)
}
