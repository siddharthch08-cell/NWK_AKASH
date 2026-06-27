import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  // Courses from batches the student is enrolled in
  const courses = await db.course.findMany({
    where: {
      status: 'PUBLISHED',
      batches: { some: { batch: { enrollments: { some: { userId: ctx.user.id } } } } },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { chapters: true } },
      batches: {
        where: { batch: { enrollments: { some: { userId: ctx.user.id } } } },
        include: { batch: { select: { id: true, name: true } } },
      },
    },
  })

  // Compute per-course progress
  const result = await Promise.all(
    courses.map(async (c) => {
      const videos = await db.video.findMany({
        where: {
          status: 'PUBLISHED',
          topic: { chapter: { courseId: c.id } },
        },
        select: { id: true },
      })
      const totalVideos = videos.length
      const completed = await db.videoProgress.count({
        where: {
          userId: ctx.user.id,
          completed: true,
          videoId: { in: videos.map((v) => v.id) },
        },
      })
      return {
        ...c,
        chapterCount: c._count.chapters,
        _count: undefined,
        totalVideos,
        completedVideos: completed,
        progressPct: totalVideos ? Math.round((completed / totalVideos) * 100) : 0,
      }
    })
  )

  return ok({ courses: result }, 'My courses')
}
