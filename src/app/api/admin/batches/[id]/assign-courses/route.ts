import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail, fromZodError } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({ courseIds: z.array(z.string()).min(1) })

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const batch = await db.batch.findUnique({ where: { id } })
  if (!batch) return notFound('Batch not found')

  const courses = await db.course.findMany({ where: { id: { in: parsed.data.courseIds } } })
  if (courses.length !== parsed.data.courseIds.length) {
    return fail('NOT_FOUND', 'One or more courses not found', 404)
  }

  let added = 0
  for (const courseId of parsed.data.courseIds) {
    try {
      await db.batchCourse.create({ data: { batchId: id, courseId } })
      added++
      await audit({ ctx, action: 'COURSE_ASSIGNED_TO_BATCH', entityType: 'BATCH_COURSE', entityId: id, after: { batchId: id, courseId } })
    } catch {
      // duplicate — skip
    }
  }
  return ok({ added }, `Assigned ${added} course(s)`)
}

/**
 * DELETE /api/admin/batches/[id]/assign-courses?courseId=<id>
 * Unassign a single course from this batch.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const url = new URL(req.url)
  const courseId = url.searchParams.get('courseId')
  if (!courseId) return fail('VALIDATION_ERROR', 'courseId query parameter is required', 400)

  const batch = await db.batch.findUnique({ where: { id } })
  if (!batch) return notFound('Batch not found')

  const result = await db.batchCourse.deleteMany({
    where: { batchId: id, courseId },
  })

  if (result.count > 0) {
    await audit({ ctx, action: 'COURSE_UNASSIGNED_FROM_BATCH', entityType: 'BATCH_COURSE', entityId: id, before: { batchId: id, courseId } })
    return ok({ removed: result.count }, 'Course unassigned from batch')
  }
  return notFound('Course assignment not found')
}
