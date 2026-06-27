import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  const attempts = await db.testAttempt.findMany({
    where: { userId: ctx.user.id, status: 'SUBMITTED' },
    orderBy: { submittedAt: 'desc' },
    include: { test: { select: { id: true, title: true, passingPct: true } } },
  })

  const avg = attempts.length ? Math.round(attempts.reduce((a, at) => a + at.percentage, 0) / attempts.length) : 0
  const best = attempts.length ? Math.max(...attempts.map((a) => a.percentage)) : 0

  return ok(
    {
      attempts,
      stats: {
        total: attempts.length,
        avgScore: avg,
        bestScore: best,
      },
    },
    'My results'
  )
}
