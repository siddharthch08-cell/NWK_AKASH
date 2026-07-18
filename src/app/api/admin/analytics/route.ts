import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

type TopVideo = {
  id: string
  title: string
  viewers: number
  avgCompletion: number
  completed: number
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const now = new Date()
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000)
  const [studentGroups, recentStudents, approvalLogs, batches, topVideos] = await Promise.all([
    db.user.groupBy({
      by: ['status'],
      where: { role: 'STUDENT', deletedAt: null },
      _count: { _all: true },
    }),
    db.user.findMany({
      where: { role: 'STUDENT', deletedAt: null, createdAt: { gte: eightWeeksAgo } },
      select: { createdAt: true },
    }),
    db.auditLog.findMany({
      where: {
        action: { in: ['STUDENT_APPROVED', 'BULK_STUDENT_APPROVED'] },
        timestamp: { gte: eightWeeksAgo },
      },
      select: { timestamp: true },
    }),
    db.batch.findMany({
      where: { status: { in: ['ACTIVE', 'UPCOMING'] } },
      select: { name: true, status: true, _count: { select: { enrollments: true } } },
      orderBy: { startDate: 'asc' },
      take: 10,
    }),
    db.$queryRaw<TopVideo[]>`
      SELECT
        v."id",
        v."title",
        COUNT(vp."id")::integer AS "viewers",
        COALESCE(ROUND(AVG(vp."percent"))::integer, 0) AS "avgCompletion",
        COUNT(vp."id") FILTER (WHERE vp."completed" = true)::integer AS "completed"
      FROM "Video" v
      LEFT JOIN "VideoProgress" vp ON vp."videoId" = v."id"
      WHERE v."status" = 'PUBLISHED' AND v."archivedAt" IS NULL
      GROUP BY v."id", v."title"
      ORDER BY COUNT(vp."id") DESC, v."title" ASC
      LIMIT 5
    `,
  ])

  const weeks: { label: string; registered: number; approved: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    weeks.push({
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      registered: recentStudents.filter((student) => student.createdAt >= start && student.createdAt < end).length,
      approved: approvalLogs.filter((log) => log.timestamp >= start && log.timestamp < end).length,
    })
  }

  const statusCounts = new Map(studentGroups.map((group) => [group.status, group._count._all]))
  return ok(
    {
      cards: {
        activeStudents: statusCounts.get('ACTIVE') ?? 0,
        approvedStudents: statusCounts.get('APPROVED') ?? 0,
        pendingStudents: statusCounts.get('PENDING') ?? 0,
        inactiveStudents: statusCounts.get('INACTIVE') ?? 0,
        blockedStudents: statusCounts.get('BLOCKED') ?? 0,
      },
      studentGrowth: weeks,
      batchEnrollment: batches.map((batch) => ({
        name: batch.name,
        enrolled: batch._count.enrollments,
        status: batch.status,
      })),
      topVideos,
    },
    'Admin analytics'
  )
}