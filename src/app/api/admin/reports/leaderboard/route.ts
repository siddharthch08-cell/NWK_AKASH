import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { tooMany, unauthorized } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { enforceRateLimit } from '@/lib/rate-limit'
import { createXlsxDownload } from '@/lib/xlsx-export'

type BestResult = { pct: number; name: string; email: string; attempts: number }

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const limit = await enforceRateLimit(req, 'export', ctx.user.id)
  if (!limit.ok) return tooMany('Too many export requests.', limit.retryAfterMs, ctx.requestId)

  const attempts = await db.testAttempt.findMany({
    where: { status: 'SUBMITTED' },
    select: {
      userId: true,
      testId: true,
      percentage: true,
      user: { select: { name: true, email: true } },
    },
    take: 10000,
  })
  const byStudent = new Map<string, Map<string, BestResult>>()
  for (const attempt of attempts) {
    const byTest = byStudent.get(attempt.userId) || new Map<string, BestResult>()
    const previous = byTest.get(attempt.testId)
    byTest.set(attempt.testId, {
      pct: Math.max(previous?.pct ?? 0, attempt.percentage),
      name: attempt.user.name,
      email: attempt.user.email,
      attempts: (previous?.attempts ?? 0) + 1,
    })
    byStudent.set(attempt.userId, byTest)
  }
  const rows = Array.from(byStudent.values()).map(byTest => {
    const results = Array.from(byTest.values())
    const scores = results.map(result => result.pct)
    return {
      rank: 0,
      name: results[0]?.name || '',
      email: results[0]?.email || '',
      testsTaken: results.length,
      avgScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
      bestScore: scores.length ? Math.max(...scores) : 0,
      totalAttempts: results.reduce((sum, result) => sum + result.attempts, 0),
    }
  })
  rows.sort((left, right) => right.avgScore - left.avgScore || right.bestScore - left.bestScore)
  rows.forEach((row, index) => { row.rank = index + 1 })

  await audit({ ctx, action: 'REPORT_EXPORTED', entityType: 'REPORT', entityId: 'leaderboard', after: { format: 'xlsx', rows: rows.length } })
  return createXlsxDownload({
    filename: `leaderboard-${Date.now()}.xlsx`,
    sheetName: 'Leaderboard',
    title: 'Naya Wallah Kanoon — Leaderboard Export',
    columns: [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Name', key: 'name' },
      { header: 'Email', key: 'email' },
      { header: 'Tests Taken', key: 'testsTaken' },
      { header: 'Avg Score %', key: 'avgScore' },
      { header: 'Best Score %', key: 'bestScore' },
      { header: 'Total Attempts', key: 'totalAttempts' },
    ],
    rows,
  })
}
