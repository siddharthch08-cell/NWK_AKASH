import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

type DashboardMetrics = {
  totalBatches: number
  activeBatches: number
  totalCourses: number
  totalVideos: number
  totalTests: number
  testsAttempted: number
  averageScore: number
  totalWatchTimeSecs: number
}

const EMPTY_METRICS: DashboardMetrics = {
  totalBatches: 0,
  activeBatches: 0,
  totalCourses: 0,
  totalVideos: 0,
  totalTests: 0,
  testsAttempted: 0,
  averageScore: 0,
  totalWatchTimeSecs: 0,
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [studentGroups, metricRows, recentLogs, recentRegistrations] = await Promise.all([
    db.user.groupBy({
      by: ['status'],
      where: { role: 'STUDENT', deletedAt: null },
      _count: { _all: true },
    }),
    db.$queryRaw<DashboardMetrics[]>`
      SELECT
        (SELECT COUNT(*)::integer FROM "Batch") AS "totalBatches",
        (SELECT COUNT(*)::integer FROM "Batch" WHERE "status" = 'ACTIVE') AS "activeBatches",
        (SELECT COUNT(*)::integer FROM "Course") AS "totalCourses",
        (SELECT COUNT(*)::integer FROM "Video") AS "totalVideos",
        (SELECT COUNT(*)::integer FROM "Test") AS "totalTests",
        (SELECT COUNT(*)::integer FROM "TestAttempt" WHERE "status" = 'SUBMITTED') AS "testsAttempted",
        COALESCE((SELECT ROUND(AVG("percentage"))::integer FROM "TestAttempt" WHERE "status" = 'SUBMITTED'), 0) AS "averageScore",
        COALESCE((SELECT SUM("position")::double precision FROM "VideoProgress"), 0) AS "totalWatchTimeSecs"
    `,
    db.auditLog.findMany({
      take: 12,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        actorRole: true,
        timestamp: true,
      },
    }),
    db.user.findMany({
      where: { role: 'STUDENT', deletedAt: null, createdAt: { gte: last30 } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, name: true, email: true, status: true, createdAt: true },
    }),
  ])

  const statusCounts = new Map(studentGroups.map((group) => [group.status, group._count._all]))
  const totalStudents = studentGroups.reduce((total, group) => total + group._count._all, 0)
  const metrics = metricRows[0] ?? EMPTY_METRICS

  return ok(
    {
      cards: {
        totalStudents,
        pendingStudents: statusCounts.get('PENDING') ?? 0,
        approvedStudents: statusCounts.get('APPROVED') ?? 0,
        activeStudents: statusCounts.get('ACTIVE') ?? 0,
        inactiveStudents: statusCounts.get('INACTIVE') ?? 0,
        blockedStudents: statusCounts.get('BLOCKED') ?? 0,
        rejectedStudents: statusCounts.get('REJECTED') ?? 0,
        ...metrics,
      },
      recentActivity: recentLogs,
      recentRegistrations,
    },
    'Admin dashboard summary'
  )
}