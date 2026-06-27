import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  // Materials from batches the student is enrolled in (BATCH or BATCH_AND_COURSE visibility),
  // plus materials for COURSE visibility assigned to courses in those batches.
  const enrollments = await db.batchEnrollment.findMany({
    where: { userId: ctx.user.id },
    select: { batchId: true },
  })
  const batchIds = enrollments.map((e) => e.batchId)

  const courseIdsInBatches = await db.batchCourse.findMany({
    where: { batchId: { in: batchIds } },
    select: { courseId: true },
  })
  const courseIds = courseIdsInBatches.map((bc) => bc.courseId)

  const materials = await db.material.findMany({
    where: {
      archived: false,
      OR: [
        { batchId: { in: batchIds } },
        { courseId: { in: courseIds }, visibility: 'COURSE' },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      batch: { select: { id: true, name: true } },
      course: { select: { id: true, title: true } },
    },
  })

  return ok({ materials }, 'My materials')
}
