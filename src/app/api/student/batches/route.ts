import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  const enrollments = await db.batchEnrollment.findMany({
    where: { userId: ctx.user.id },
    include: {
      batch: {
        include: {
          _count: { select: { courses: true, tests: true, materials: true } },
          courses: { include: { course: { select: { id: true, title: true, thumbnail: true, status: true } } } },
          tests: {
            include: {
              test: {
                select: { id: true, title: true, status: true, startAt: true, endAt: true, durationMins: true },
              },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  })

  return ok(
    {
      batches: enrollments.map((e) => ({
        id: e.batch.id,
        name: e.batch.name,
        slug: e.batch.slug,
        description: e.batch.description,
        thumbnail: e.batch.thumbnail,
        status: e.batch.status,
        startDate: e.batch.startDate,
        endDate: e.batch.endDate,
        courseCount: e.batch._count.courses,
        testCount: e.batch._count.tests,
        materialCount: e.batch._count.materials,
        enrolledAt: e.enrolledAt,
        courses: e.batch.courses.map((bc) => bc.course),
        tests: e.batch.tests.map((bt) => bt.test),
      })),
    },
    'My batches'
  )
}
