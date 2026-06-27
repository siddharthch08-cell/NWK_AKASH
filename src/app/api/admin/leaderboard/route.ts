import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const url = new URL(req.url)
  const batchId = url.searchParams.get('batchId') || undefined
  const testId = url.searchParams.get('testId') || undefined

  const where: Prisma.TestAttemptWhereInput = { status: 'SUBMITTED' }
  if (batchId) where.test = { batches: { some: { batchId } } }
  if (testId) where.testId = testId

  const attempts = await db.testAttempt.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
    take: 500,
    include: {
      user: { select: { id: true, name: true, email: true } },
      test: { select: { id: true, title: true, passingPct: true } },
    },
  })

  // Aggregate per student
  const byStudent = new Map<string, { user: any; totalScore: number; totalMarks: number; attempts: number; totalTime: number; testsTaken: Set<string> }>()
  for (const a of attempts) {
    const existing = byStudent.get(a.userId) || {
      user: a.user,
      totalScore: 0,
      totalMarks: 0,
      attempts: 0,
      totalTime: 0,
      testsTaken: new Set<string>(),
    }
    // Use BEST attempt per test for the student (highest percentage)
    // For simplicity here we sum the best attempt per test
    existing.totalScore += a.score
    existing.totalMarks += a.totalMarks
    existing.attempts += 1
    existing.totalTime += a.timeTakenSecs
    existing.testsTaken.add(a.testId)
    byStudent.set(a.userId, existing)
  }

  // For correct leaderboard, recompute using best attempt per test per user
  const bestPerTest = new Map<string, Map<string, number>>() // userId -> testId -> bestPct
  for (const a of attempts) {
    const userMap = bestPerTest.get(a.userId) || new Map<string, number>()
    const prev = userMap.get(a.testId) ?? -1
    if (a.percentage > prev) userMap.set(a.testId, a.percentage)
    bestPerTest.set(a.userId, userMap)
  }

  const leaderboard = Array.from(bestPerTest.entries()).map(([userId, testMap]) => {
    const pcts = Array.from(testMap.values())
    const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0
    const best = pcts.length ? Math.max(...pcts) : 0
    const userInfo = byStudent.get(userId)?.user
    return {
      userId,
      name: userInfo?.name || 'Unknown',
      avgScore: avg,
      bestScore: best,
      testsTaken: testMap.size,
      totalAttempts: byStudent.get(userId)?.attempts || 0,
      totalTime: byStudent.get(userId)?.totalTime || 0,
    }
  })

  // Tie-breakers:
  // 1. Higher avg, 2. Higher best, 3. More tests taken, 4. Lower total time, 5. Earlier (stable)
  leaderboard.sort((a, b) =>
    b.avgScore - a.avgScore ||
    b.bestScore - a.bestScore ||
    b.testsTaken - a.testsTaken ||
    a.totalTime - b.totalTime
  )

  const ranked = leaderboard.map((e, i) => ({ rank: i + 1, ...e }))
  return ok({ leaderboard: ranked }, 'Leaderboard')
}
