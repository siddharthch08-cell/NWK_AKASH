import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  const userId = ctx.user.id
  const courses = await db.course.findMany({
    where: {
      status: 'PUBLISHED',
      batches: { some: { batch: { status: 'ACTIVE', enrollments: { some: { userId } } } } },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { chapters: { where: { archivedAt: null } } } },
      batches: {
        where: { batch: { status: 'ACTIVE', enrollments: { some: { userId } } } },
        include: { batch: { select: { id: true, name: true } } },
      },
    },
  })

  const courseIds = courses.map((course) => course.id)
  const videos = courseIds.length === 0
    ? []
    : await db.video.findMany({
        where: {
          status: 'PUBLISHED',
          archivedAt: null,
          topic: { archivedAt: null, chapter: { courseId: { in: courseIds }, archivedAt: null } },
        },
        select: {
          topic: { select: { chapter: { select: { courseId: true } } } },
          _count: { select: { progress: { where: { userId, completed: true } } } },
        },
      })

  const progressByCourse = new Map<string, { total: number; completed: number }>()
  for (const video of videos) {
    const courseId = video.topic.chapter.courseId
    const progress = progressByCourse.get(courseId) ?? { total: 0, completed: 0 }
    progress.total += 1
    progress.completed += video._count.progress
    progressByCourse.set(courseId, progress)
  }

  const result = courses.map((course) => {
    const progress = progressByCourse.get(course.id) ?? { total: 0, completed: 0 }
    const { _count, ...courseData } = course
    return {
      ...courseData,
      chapterCount: _count.chapters,
      totalVideos: progress.total,
      completedVideos: progress.completed,
      progressPct: progress.total ? Math.round((progress.completed / progress.total) * 100) : 0,
    }
  })

  return ok({ courses: result }, 'My courses')
}