import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const now = new Date()
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalStudents,
    pendingStudents,
    approvedStudents,
    activeStudents,
    inactiveStudents,
    blockedStudents,
    rejectedStudents,
    totalBatches,
    activeBatches,
    totalCourses,
    totalVideos,
    totalTests,
    testAttemptsCount,
    avgScoreAgg,
    watchTimeAgg,
    recentLogs,
    recentRegistrations,
  ] = await Promise.all([
    db.user.count({ where: { role: 'STUDENT' } }),
    db.user.count({ where: { role: 'STUDENT', status: 'PENDING' } }),
    db.user.count({ where: { role: 'STUDENT', status: 'APPROVED' } }),
    db.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
    db.user.count({ where: { role: 'STUDENT', status: 'INACTIVE' } }),
    db.user.count({ where: { role: 'STUDENT', status: 'BLOCKED' } }),
    db.user.count({ where: { role: 'STUDENT', status: 'REJECTED' } }),
    db.batch.count(),
    db.batch.count({ where: { status: 'ACTIVE' } }),
    db.course.count(),
    db.video.count(),
    db.test.count(),
    db.testAttempt.count({ where: { status: 'SUBMITTED' } }),
    db.testAttempt.aggregate({ _avg: { percentage: true }, where: { status: 'SUBMITTED' } }),
    db.videoProgress.aggregate({ _sum: { position: true } }),
    db.auditLog.findMany({ take: 12, orderBy: { timestamp: 'desc' } }),
    db.user.findMany({
      where: { role: 'STUDENT', createdAt: { gte: last30 } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, name: true, email: true, status: true, createdAt: true },
    }),
  ])

  // Student growth — last 8 weeks
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000)
  const recentStudents = await db.user.findMany({
    where: { role: 'STUDENT', createdAt: { gte: eightWeeksAgo } },
    select: { createdAt: true, status: true },
  })
  // Fetch approval events from audit logs for the same period
  const approvalLogs = await db.auditLog.findMany({
    where: {
      action: { in: ['STUDENT_APPROVED', 'BULK_STUDENT_APPROVED'] },
      timestamp: { gte: eightWeeksAgo },
    },
    select: { timestamp: true },
  })
  const weeks: { label: string; registered: number; approved: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const label = `${start.getMonth() + 1}/${start.getDate()}`
    const registered = recentStudents.filter(
      (s) => s.createdAt >= start && s.createdAt < end
    ).length
    const approved = approvalLogs.filter(
      (l) => l.timestamp >= start && l.timestamp < end
    ).length
    weeks.push({ label, registered, approved })
  }

  // Batch enrollment
  const batches = await db.batch.findMany({
    where: { status: { in: ['ACTIVE', 'UPCOMING'] } },
    select: { id: true, name: true, status: true, _count: { select: { enrollments: true } } },
    take: 10,
  })
  const batchEnrollment = batches.map((b) => ({ name: b.name, enrolled: b._count.enrollments, status: b.status }))

  // Most watched videos
  const videos = await db.video.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      _count: { select: { progress: true } },
      progress: { select: { percent: true, completed: true } },
    },
    take: 8,
  })
  const topVideos = videos
    .map((v) => {
      const viewers = v._count.progress
      const avgPct = viewers ? Math.round(v.progress.reduce((a, p) => a + p.percent, 0) / viewers) : 0
      const completed = v.progress.filter((p) => p.completed).length
      return { id: v.id, title: v.title, viewers, avgCompletion: avgPct, completed }
    })
    .sort((a, b) => b.viewers - a.viewers)
    .slice(0, 5)

  return ok(
    {
      cards: {
        totalStudents,
        pendingStudents,
        approvedStudents,
        activeStudents,
        inactiveStudents,
        blockedStudents,
        rejectedStudents,
        totalBatches,
        activeBatches,
        totalCourses,
        totalVideos,
        totalTests,
        testsAttempted: testAttemptsCount,
        averageScore: avgScoreAgg._avg.percentage ? Math.round(avgScoreAgg._avg.percentage) : 0,
        totalWatchTimeSecs: watchTimeAgg._sum.position || 0,
      },
      studentGrowth: weeks,
      batchEnrollment,
      topVideos,
      recentActivity: recentLogs.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        actorRole: l.actorRole,
        timestamp: l.timestamp,
      })),
      recentRegistrations,
    },
    'Admin dashboard data'
  )
}
