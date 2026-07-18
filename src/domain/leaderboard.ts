/**
 * LeaderboardService — shared leaderboard algorithm for admin and student routes.
 *
 * Consolidates:
 *  - GET /api/admin/leaderboard
 *  - GET /api/student/leaderboard
 *
 * Uses best-attempt-per-test-per-user ranking with consistent tie-breaking:
 *  1. Higher average percentage
 *  2. Higher best score
 *  3. More tests taken
 *  4. Lower total time
 */

import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import type { LeaderboardEntry } from './types'

type LeaderboardOptions = {
  batchId?: string
  testId?: string
  limit?: number
}

/**
 * Compute leaderboard from submitted attempts.
 * Only includes attempts with published results.
 */
export async function computeLeaderboard(options: LeaderboardOptions = {}): Promise<LeaderboardEntry[]> {
  const { batchId, testId, limit = 500 } = options

  // Build filter
  const where: Prisma.TestAttemptWhereInput = {
    status: 'SUBMITTED',
    resultPublishedAt: { not: null },
  }
  if (testId) where.testId = testId
  if (batchId) where.test = { batches: { some: { batchId } } }

  const attempts = await db.testAttempt.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  // Build best-attempt-per-test per user
  const bestPerTest = new Map<string, {
    user: { id: string; name: string; email: string }
    testMap: Map<string, number>
    totalAttempts: number
    totalTime: number
  }>()

  for (const a of attempts) {
    const entry = bestPerTest.get(a.userId) || {
      user: a.user,
      testMap: new Map<string, number>(),
      totalAttempts: 0,
      totalTime: 0,
    }
    const prev = entry.testMap.get(a.testId) ?? -1
    if (a.percentage > prev) entry.testMap.set(a.testId, a.percentage)
    entry.totalAttempts++
    entry.totalTime += a.timeTakenSecs
    bestPerTest.set(a.userId, entry)
  }

  // Build leaderboard entries
  const leaderboard: LeaderboardEntry[] = Array.from(bestPerTest.entries()).map(([userId, e]) => {
    const pcts = Array.from(e.testMap.values())
    return {
      rank: 0, // assigned after sorting
      userId,
      name: e.user.name,
      email: e.user.email,
      avgScore: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
      bestScore: pcts.length ? Math.max(...pcts) : 0,
      testsTaken: e.testMap.size,
      totalAttempts: e.totalAttempts,
      totalTime: e.totalTime,
    }
  })

  // Sort: 1. Higher avg, 2. Higher best, 3. More tests, 4. Lower time
  leaderboard.sort((a, b) =>
    b.avgScore - a.avgScore ||
    b.bestScore - a.bestScore ||
    b.testsTaken - a.testsTaken ||
    a.totalTime - b.totalTime
  )

  // Assign ranks
  return leaderboard.map((e, i) => ({ ...e, rank: i + 1 }))
}

/**
 * Get a student's rank from a pre-computed leaderboard.
 */
export function findRank(leaderboard: LeaderboardEntry[], userId: string): number | null {
  const entry = leaderboard.find(e => e.userId === userId)
  return entry?.rank ?? null
}

/**
 * Compute leaderboard for student (only published results).
 */
export async function computeStudentLeaderboard(
  userId: string,
  batchId?: string,
): Promise<{ leaderboard: LeaderboardEntry[]; myRank: number | null }> {
  // Get student's accessible batches
  const enrollments = await db.batchEnrollment.findMany({
    where: {
      userId,
      batch: { status: { in: ['ACTIVE', 'UPCOMING', 'COMPLETED'] } },
    },
    select: { batchId: true },
  })
  const accessibleBatchIds = enrollments.map(e => e.batchId)

  if (accessibleBatchIds.length === 0) {
    return { leaderboard: [], myRank: null }
  }

  const targetBatchIds = batchId ? [batchId] : accessibleBatchIds

  const leaderboard = await computeLeaderboard({
    batchId: targetBatchIds.length === 1 ? targetBatchIds[0] : undefined,
    limit: 10000,
  })

  const myRank = findRank(leaderboard, userId)
  return { leaderboard, myRank }
}
