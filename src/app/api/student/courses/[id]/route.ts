import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized, notFound, forbidden } from '@/lib/api-response'
import { StudentContentAccessPolicy } from '@/domain'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const access = await StudentContentAccessPolicy.canAccessCourse(ctx.user.id, id)
  if (!access.allowed) return forbidden(access.reason)

  // Verify access: student must be enrolled in a batch that has this course
  const course = await db.course.findUnique({
    where: { id },
    include: {
      chapters: {
        where: { archivedAt: null },
        orderBy: { order: 'asc' },
        include: {
          topics: {
            where: { archivedAt: null },
            orderBy: { order: 'asc' },
            include: {
              videos: {
                where: { status: 'PUBLISHED', archivedAt: null },
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
