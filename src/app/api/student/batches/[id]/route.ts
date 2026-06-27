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
      materials: {
        where: { archived: false, OR: [{ batchId: id }, { visibility: 'COURSE' }] },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, fileName: true, fileType: true, fileSize: true, materialType: true, createdAt: true },
      },
      announcements: {
        where: {
          status: 'PUBLISHED',
          publishAt: { lte: new Date() },
          OR: [{ expireAt: null }, { expireAt: { gt: new Date() } }],
        },
        orderBy: [{ pinned: 'desc' }, { publishAt: 'desc' }],
        take: 5,
        select: { id: true, title: true, message: true, priority: true, pinned: true, publishAt: true },
      },
    },
  })
  if (!batch) return notFound('Batch not found')

  return ok({ batch }, 'Batch detail')
}
