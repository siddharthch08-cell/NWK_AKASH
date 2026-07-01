import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized, notFound, forbidden } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  // Verify access: student must be enrolled in a batch that has this course
  const course = await db.course.findUnique({
    where: { id },
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
      batches: { include: { batch: true } },
    },
  })
  if (!course) return notFound('Course not found')
  if (course.status !== 'PUBLISHED') return notFound('Course not found')

  // Strict check: is the student enrolled in ANY batch that has this course?
  const hasAccess = await db.batchEnrollment.findFirst({
    where: {
      userId: ctx.user.id,
      batch: {
        courses: { some: { courseId: id } },
        status: { in: ['ACTIVE', 'UPCOMING', 'COMPLETED'] },
      },
    },
  })
  if (!hasAccess) return forbidden('You do not have access to this course')

  return ok(
    {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnail: course.thumbnail,
        chapters: course.chapters.map((ch) => ({
          id: ch.id,
          title: ch.title,
          order: ch.order,
          topics: ch.topics.map((t) => ({
            id: t.id,
            title: t.title,
            order: t.order,
            videos: t.videos.map((v) => ({
              id: v.id,
              title: v.title,
              description: v.description,
              youtubeId: v.youtubeId,
              thumbnail: v.thumbnail,
              duration: v.duration,
              order: v.order,
              progress: v.progress[0] || null,
            })),
          })),
        })),
      },
    },
    'Course detail'
  )
}
