import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized, forbidden } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  const url = new URL(req.url)
  const requestedBatchId = url.searchParams.get('batchId') || undefined

  // Get student's accessible batch IDs
  const enrollments = await db.batchEnrollment.findMany({
    where: {
      userId: ctx.user.id,
      batch: { status: { in: ['ACTIVE', 'UPCOMING', 'COMPLETED'] } },
    },
    select: { batchId: true },
  })
  const accessibleBatchIds = enrollments.map((e) => e.batchId)

  // If a specific batchId is requested, verify the student is enrolled in it
  if (requestedBatchId) {
    if (!accessibleBatchIds.includes(requestedBatchId)) {
      return forbidden('You do not have access to this batch')
    }
  }

  const targetBatchIds = requestedBatchId ? [requestedBatchId] : accessibleBatchIds

  if (targetBatchIds.length === 0) return ok({ leaderboard: [], myRank: null }, 'Leaderboard')

  const attempts = await db.testAttempt.findMany({
    where: {
      status: 'SUBMITTED',
      resultPublishedAt: { not: null },
      test: { batches: { some: { batchId: { in: targetBatchIds } } } },
    },
    include: { user: { select: { id: true, name: true, photo: true } } },
    take: 10000,
  })

  // Build best-attempt-per-test per user
  const bestPerTest = new Map<string, { user: any; testMap: Map<string, number>; totalAttempts: number; totalTime: number }>()
  for (const a of attempts) {
    const entry = bestPerTest.get(a.userId) || { user: a.user, testMap: new Map<string, number>(), totalAttempts: 0, totalTime: 0 }
    const prev = entry.testMap.get(a.testId) ?? -1
    if (a.percentage > prev) entry.testMap.set(a.testId, a.percentage)
    entry.totalAttempts++
    entry.totalTime += a.timeTakenSecs
    bestPerTest.set(a.userId, entry)
  }

  const leaderboard = Array.from(bestPerTest.entries()).map(([userId, e]) => {
    const pcts = Array.from(e.testMap.values())
    return {
      userId,
      name: e.user.name,
      photo: e.user.photo,
      avgScore: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
      bestScore: pcts.length ? Math.max(...pcts) : 0,
      testsTaken: e.testMap.size,
      totalAttempts: e.totalAttempts,
      totalTime: e.totalTime,
    }
  })
  leaderboard.sort((a, b) =>
    b.avgScore - a.avgScore ||
    b.bestScore - a.bestScore ||
    b.testsTaken - a.testsTaken ||
    a.totalTime - b.totalTime
  )
  const ranked = leaderboard.map((e, i) => ({ rank: i + 1, ...e }))
  const myRank = ranked.find((r) => r.userId === ctx.user.id)?.rank || null

  return ok({ leaderboard: ranked, myRank }, 'Leaderboard')
}
