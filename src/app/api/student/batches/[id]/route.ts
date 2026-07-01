import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized, notFound, forbidden } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  // Verify the student is enrolled in this batch
  const enrollment = await db.batchEnrollment.findUnique({
    where: { batchId_userId: { batchId: id, userId: ctx.user.id } },
  })
  if (!enrollment) return forbidden('You are not enrolled in this batch')

  const batch = await db.batch.findUnique({
    where: { id },
    include: {
      courses: {
        include: {
          course: {
            include: {
              chapters: {
                orderBy: { order: 'asc' },
                include: {
                  topics: {
                    orderBy: { order: 'asc' },
                    include: {
                      videos: {
                        where: { status: 'PUBLISHED' },
                        orderBy: { order: 'asc' },
                        include: {
                          progress: {
                            where: { userId: ctx.user.id },
                            select: { id: true, percent: true, completed: true, position: true, lastWatchedAt: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      tests: {
        include: {
          test: {
            select: { id: true, title: true, status: true, startAt: true, endAt: true, durationMins: true, maxAttempts: true },
          },
        },
      },
    },
  })
  if (!batch) return notFound('Batch not found')

  // Fetch materials separately (they belong to courses, not batches)
  const courseIds = batch.courses.map((bc) => bc.course.id)
  const materials = courseIds.length > 0 ? await db.material.findMany({
    where: {
      archived: false,
      published: true,
      courseId: { in: courseIds },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, platform: true, externalUrl: true, materialType: true, courseId: true, chapterId: true, topicId: true, createdAt: true },
  }) : []

  // Fetch announcements separately (they go through AnnouncementBatch join table)
  const now = new Date()
  const announcements = await db.announcement.findMany({
    where: {
      status: 'PUBLISHED',
      publishAt: { lte: now },
      AND: [
        { OR: [{ expireAt: null }, { expireAt: { gt: now } }] },
        {
          OR: [
            { audience: 'ALL_STUDENTS' },
            { audience: 'BATCH', batches: { some: { batchId: id } } },
          ],
        },
      ],
    },
    orderBy: [{ pinned: 'desc' }, { publishAt: 'desc' }],
    take: 5,
    select: { id: true, title: true, message: true, priority: true, pinned: true, publishAt: true },
  })

  return ok({ batch: { ...batch, materials, announcements } }, 'Batch detail')
}
