import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized, notFound, forbidden } from '@/lib/api-response'
import { StudentContentAccessPolicy } from '@/domain'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const access = await StudentContentAccessPolicy.canAccessTest(ctx.user.id, id)
  if (!access.allowed) return forbidden(access.reason)

  const test = await db.test.findUnique({
    where: { id },
    include: {
      batches: { include: { batch: { select: { id: true, name: true } } } },
      _count: { select: { questions: true } },
      attempts: {
        where: { userId: ctx.user.id },
        orderBy: { attemptNumber: 'desc' },
      },
    },
  })
  if (!test || test.status !== 'PUBLISHED') return notFound('Test not found')

  const submittedAttempts = test.attempts.filter((a) => a.status === 'SUBMITTED')
  const inProgress = test.attempts.find((a) => a.status === 'IN_PROGRESS')
  const attemptsUsed = submittedAttempts.length

  return ok(
    {
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        instructions: test.instructions,
        durationMins: test.durationMins,
        maxAttempts: test.maxAttempts,
        startAt: test.startAt,
        endAt: test.endAt,
        passingPct: test.passingPct,
        showAnswerKey: test.showAnswerKey,
        showResultImmediately: test.showResultImmediately,
        questionCount: test._count.questions,
        batches: test.batches.map((bt) => bt.batch.name),
        attemptsUsed,
        attemptsRemaining: Math.max(0, test.maxAttempts - attemptsUsed),
        inProgressAttempt: inProgress
          ? {
              id: inProgress.id,
              startedAt: inProgress.startedAt,
              expiresAt: inProgress.expiresAt,
              attemptNumber: inProgress.attemptNumber,
            }
          : null,
        pastAttempts: submittedAttempts.map((a) => ({
          id: a.id,
          attemptNumber: a.attemptNumber,
          score: a.score,
          totalMarks: a.totalMarks,
          percentage: a.percentage,
          timeTakenSecs: a.timeTakenSecs,
          submittedAt: a.submittedAt,
        })),
      },
    },
    'Test detail'
  )
}
