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

  // Hide scores for unpublished results
  const safeAttempts = attempts.map((a) => {
    const published = !!a.resultPublishedAt
    return {
      id: a.id,
      attemptNumber: a.attemptNumber,
      testId: a.testId,
      submittedAt: a.submittedAt,
      resultPublished: published,
      // Only include score fields if published
      ...(published
        ? { score: a.score, totalMarks: a.totalMarks, percentage: a.percentage, timeTakenSecs: a.timeTakenSecs }
        : { score: null, totalMarks: null, percentage: null, timeTakenSecs: null }),
      test: a.test,
    }
  })

  // Stats only from published attempts
  const published = attempts.filter((a) => !!a.resultPublishedAt)
  const avg = published.length ? Math.round(published.reduce((a, at) => a + at.percentage, 0) / published.length) : 0
  const best = published.length ? Math.max(...published.map((a) => a.percentage)) : 0

  return ok(
    {
      attempts: safeAttempts,
      stats: {
        total: attempts.length,
        published: published.length,
        avgScore: avg,
        bestScore: best,
      },
    },
    'My results'
  )
}
