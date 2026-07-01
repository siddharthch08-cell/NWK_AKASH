import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  const now = new Date()
  const userId = ctx.user.id

  const [enrollments, videoProgress, attempts, announcements, recentVideos, upcomingTests] = await Promise.all([
    db.batchEnrollment.findMany({
      where: { userId },
      include: {
        batch: {
          select: {
            id: true, name: true, slug: true, status: true, thumbnail: true,
            courses: { include: { course: { select: { id: true, title: true, thumbnail: true } } } },
            tests: { include: { test: { select: { id: true, title: true, startAt: true, endAt: true, status: true } } } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    }),
    db.videoProgress.findMany({
      where: { userId },
      include: { video: { select: { id: true, title: true, duration: true, topic: { select: { chapter: { select: { course: { select: { id: true, title: true } } } } } } } } },
      orderBy: { lastWatchedAt: 'desc' },
      take: 8,
    }),
    db.testAttempt.findMany({
      where: { userId, status: 'SUBMITTED', resultPublishedAt: { not: null } },
      include: { test: { select: { id: true, title: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 10,
    }),
    db.announcement.findMany({
      where: {
        status: 'PUBLISHED',
        publishAt: { lte: now },
        AND: [
          { OR: [{ expireAt: null }, { expireAt: { gt: now } }] },
          {
            OR: [
              { audience: 'ALL_STUDENTS' },
              { audience: 'BATCH', batches: { some: { batch: { enrollments: { some: { userId } } } } } },
            ],
          },
        ],
      },
      orderBy: [{ pinned: 'desc' }, { publishAt: 'desc' }],
      take: 5,
      select: { id: true, title: true, message: true, priority: true, pinned: true, publishAt: true },
    }),
    db.videoProgress.findMany({
      where: { userId, completed: false },
      include: { video: { select: { id: true, title: true, thumbnail: true, topic: { select: { chapter: { select: { course: { select: { id: true, title: true } } } } } } } } },
      orderBy: { lastWatchedAt: 'desc' },
      take: 4,
    }),
    db.test.findMany({
      where: {
        status: 'PUBLISHED',
        batches: { some: { batch: { enrollments: { some: { userId } } } } },
        startAt: { gte: now },
      },
      orderBy: { startAt: 'asc' },
      take: 5,
      select: { id: true, title: true, startAt: true, endAt: true, durationMins: true },
    }),
  ])

  // Aggregate stats
  const videosCompleted = videoProgress.filter((p) => p.completed).length
  const totalVideos = await db.video.count({
    where: {
      status: 'PUBLISHED',
      topic: { chapter: { course: { batches: { some: { batch: { enrollments: { some: { userId } } } } } } } },
    },
  })
  // Stats from ALL published attempts (not just the take:10 slice)
  const allPublishedAttempts = await db.testAttempt.findMany({
    where: { userId, status: 'SUBMITTED', resultPublishedAt: { not: null } },
    select: { percentage: true },
  })
  const avgScore = allPublishedAttempts.length
    ? Math.round(allPublishedAttempts.reduce((a, at) => a + at.percentage, 0) / allPublishedAttempts.length)
    : 0
  const bestScore = allPublishedAttempts.length ? Math.max(...allPublishedAttempts.map((a) => a.percentage)) : 0

  // Count active tests (available now)
  const activeTests = await db.test.count({
    where: {
      status: 'PUBLISHED',
      batches: { some: { batch: { enrollments: { some: { userId } } } } },
      startAt: { lte: now },
      OR: [{ endAt: null }, { endAt: { gte: now } }],
    },
  })

  // Course progress: compute per unique enrolled course (deduplicate by courseId)
  const seenCourseIds = new Set<string>()
  const courseProgressRaw = await Promise.all(
    enrollments.flatMap((e) =>
      e.batch.courses.map(async (bc) => {
        if (seenCourseIds.has(bc.course.id)) return null // deduplicate
        seenCourseIds.add(bc.course.id)
        const courseVideos = await db.video.findMany({
          where: {
            status: 'PUBLISHED',
            topic: { chapter: { courseId: bc.course.id } },
          },
          select: { id: true },
        })
        const total = courseVideos.length
        const completed = await db.videoProgress.count({
          where: {
            userId,
            completed: true,
            videoId: { in: courseVideos.map((v) => v.id) },
          },
        })
        return {
          courseId: bc.course.id,
          courseTitle: bc.course.title,
          thumbnail: bc.course.thumbnail,
          batchName: e.batch.name,
          totalVideos: total,
          completedVideos: completed,
          progressPct: total ? Math.round((completed / total) * 100) : 0,
        }
      })
    )
  )
  const courseProgress = courseProgressRaw.filter((c): c is NonNullable<typeof c> => c !== null)

  return ok(
    {
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        status: ctx.user.status,
      },
      stats: {
        enrolledBatches: enrollments.length,
        activeTests,
        upcomingTests: upcomingTests.length,
        videosCompleted,
        totalVideos,
        avgScore,
        bestScore,
        attemptsCount: attempts.length,
      },
      enrollments: enrollments.map((e) => ({
        id: e.batch.id,
        name: e.batch.name,
        slug: e.batch.slug,
        status: e.batch.status,
        thumbnail: e.batch.thumbnail,
        courseCount: e.batch.courses.length,
        testCount: e.batch.tests.length,
        enrolledAt: e.enrolledAt,
      })),
      courseProgress,
      upcomingTests,
      recentResults: attempts.slice(0, 5),
      recentAnnouncements: announcements,
      continueWatching: recentVideos.slice(0, 4).map((p) => ({
        videoId: p.video.id,
        title: p.video.title,
        thumbnail: p.video.thumbnail,
        courseId: p.video.topic.chapter.course.id,
        courseTitle: p.video.topic.chapter.course.title,
        percent: p.percent,
        position: p.position,
      })),
    },
    'Student dashboard'
  )
}
