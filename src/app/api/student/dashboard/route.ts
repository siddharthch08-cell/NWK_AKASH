import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  const now = new Date()
  const userId = ctx.user.id
  const accessibleTestWhere = {
    status: 'PUBLISHED' as const,
    batches: { some: { batch: { status: 'ACTIVE', enrollments: { some: { userId } } } } },
  }

  const [
    enrollments,
    recentVideos,
    attempts,
    announcements,
    upcomingTests,
    activeTests,
    upcomingTestsCount,
    attemptStats,
  ] = await Promise.all([
    db.batchEnrollment.findMany({
      where: { userId, batch: { status: 'ACTIVE' } },
      select: {
        enrolledAt: true,
        batch: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            thumbnail: true,
            courses: {
              where: { course: { status: 'PUBLISHED' } },
              select: { course: { select: { id: true, title: true, thumbnail: true } } },
            },
            _count: { select: { tests: { where: { test: { status: 'PUBLISHED' } } } } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    }),
    db.videoProgress.findMany({
      where: { userId, completed: false },
      select: {
        percent: true,
        position: true,
        video: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            topic: { select: { chapter: { select: { course: { select: { id: true, title: true } } } } } },
          },
        },
      },
      orderBy: { lastWatchedAt: 'desc' },
      take: 4,
    }),
    db.testAttempt.findMany({
      where: { userId, status: 'SUBMITTED', resultPublishedAt: { not: null } },
      select: {
        id: true,
        attemptNumber: true,
        percentage: true,
        score: true,
        totalMarks: true,
        submittedAt: true,
        test: { select: { id: true, title: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 5,
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
    db.test.findMany({
      where: { ...accessibleTestWhere, startAt: { gt: now } },
      orderBy: { startAt: 'asc' },
      take: 5,
      select: { id: true, title: true, startAt: true, endAt: true, durationMins: true },
    }),
    db.test.count({
      where: {
        ...accessibleTestWhere,
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gte: now } }],
      },
    }),
    db.test.count({ where: { ...accessibleTestWhere, startAt: { gt: now } } }),
    db.testAttempt.aggregate({
      where: { userId, status: 'SUBMITTED', resultPublishedAt: { not: null } },
      _avg: { percentage: true },
      _max: { percentage: true },
      _count: { _all: true },
    }),
  ])

  const courseMetadata = new Map<string, { courseTitle: string; thumbnail: string | null; batchName: string }>()
  for (const enrollment of enrollments) {
    for (const batchCourse of enrollment.batch.courses) {
      if (!courseMetadata.has(batchCourse.course.id)) {
        courseMetadata.set(batchCourse.course.id, {
          courseTitle: batchCourse.course.title,
          thumbnail: batchCourse.course.thumbnail,
          batchName: enrollment.batch.name,
        })
      }
    }
  }

  const courseIds = Array.from(courseMetadata.keys())
  const courseVideos = courseIds.length === 0
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
  for (const video of courseVideos) {
    const courseId = video.topic.chapter.courseId
    const current = progressByCourse.get(courseId) ?? { total: 0, completed: 0 }
    current.total += 1
    current.completed += video._count.progress
    progressByCourse.set(courseId, current)
  }

  const courseProgress = courseIds.map((courseId) => {
    const metadata = courseMetadata.get(courseId)
    if (!metadata) throw new Error('Course metadata invariant failed')
    const progress = progressByCourse.get(courseId) ?? { total: 0, completed: 0 }
    return {
      courseId,
      ...metadata,
      totalVideos: progress.total,
      completedVideos: progress.completed,
      progressPct: progress.total ? Math.round((progress.completed / progress.total) * 100) : 0,
    }
  })
  const videosCompleted = courseProgress.reduce((total, course) => total + course.completedVideos, 0)

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
        upcomingTests: upcomingTestsCount,
        videosCompleted,
        totalVideos: courseVideos.length,
        avgScore: Math.round(attemptStats._avg.percentage ?? 0),
        bestScore: attemptStats._max.percentage ?? 0,
        attemptsCount: attemptStats._count._all,
      },
      enrollments: enrollments.map((enrollment) => ({
        id: enrollment.batch.id,
        name: enrollment.batch.name,
        slug: enrollment.batch.slug,
        status: enrollment.batch.status,
        thumbnail: enrollment.batch.thumbnail,
        courseCount: enrollment.batch.courses.length,
        testCount: enrollment.batch._count.tests,
        enrolledAt: enrollment.enrolledAt,
      })),
      courseProgress,
      upcomingTests,
      recentResults: attempts,
      recentAnnouncements: announcements,
      continueWatching: recentVideos.map((progress) => ({
        videoId: progress.video.id,
        title: progress.video.title,
        thumbnail: progress.video.thumbnail,
        courseId: progress.video.topic.chapter.course.id,
        courseTitle: progress.video.topic.chapter.course.title,
        percent: progress.percent,
        position: progress.position,
      })),
    },
    'Student dashboard'
  )
}