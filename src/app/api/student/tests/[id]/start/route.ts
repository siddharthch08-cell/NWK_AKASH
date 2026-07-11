import { NextRequest } from 'next/server'
import { requireActiveStudent } from '@/lib/auth'
import { db } from '@/lib/db'
import { fail, ok, tooMany, unauthorized } from '@/lib/api-response'
import { DomainError, TestAttemptService } from '@/domain'
import { enforceRateLimit } from '@/lib/rate-limit'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const limit = await enforceRateLimit(req, 'testStart', ctx.user.id)
  if (!limit.ok) return tooMany('Too many attempt start requests.', limit.retryAfterMs, ctx.requestId)
  try {
    const result = await TestAttemptService.startAttempt((await params).id, ctx.user.id)
    const { test, attempt } = result
    const saved = await db.attemptAnswer.findMany({ where: { attemptId: attempt.id }, select: { questionId: true, selectedOptionId: true, revision: true } })
    const savedAnswers = Object.fromEntries(saved.map(answer => [answer.questionId, answer.selectedOptionId]))
    const savedAnswerRevisions = Object.fromEntries(saved.map(answer => [answer.questionId, answer.revision]))
    return ok({
      attempt: {
        id: attempt.id, attemptNumber: attempt.attemptNumber, startedAt: attempt.startedAt, expiresAt: attempt.expiresAt,
        durationMins: test.durationMins, remainingSecs: Math.max(0, Math.floor((attempt.expiresAt.getTime() - Date.now()) / 1000)),
      },
      test: {
        id: test.id, title: test.title, instructions: test.instructions, durationMins: test.durationMins,
        showResultImmediately: test.showResultImmediately, passingPct: test.passingPct,
      },
      questions: test.questions.map((q) => ({
        id: q.id, text: q.text, marks: q.marks, order: q.order,
        options: q.options.map((o) => ({ id: o.id, text: o.text, order: o.order })),
      })),
      savedAnswers,
      savedAnswerRevisions,
      resumed: result.action === 'resume',
    }, result.action === 'resume' ? 'Resumed active attempt' : 'Test attempt started', undefined, result.action === 'resume' ? 200 : 201)
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields)
    throw error
  }
}
