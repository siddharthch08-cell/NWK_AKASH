import { NextRequest } from 'next/server'
import { requireActiveStudent } from '@/lib/auth'
import { fail, fromZodError, ok, tooMany, unauthorized } from '@/lib/api-response'
import { attemptSubmitSchema } from '@/lib/validation'
import { enforceRateLimit } from '@/lib/rate-limit'
import { DomainError, ResultService, TestAttemptService } from '@/domain'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const limit = await enforceRateLimit(req, 'answerSave', ctx.user.id)
  if (!limit.ok) return tooMany('Too many answer save requests.', limit.retryAfterMs, ctx.requestId)
  const { id } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400, undefined, ctx.requestId)
  }
  const parsed = attemptSubmitSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error, ctx.requestId)

  try {
    if (parsed.data.finalize === false) {
      const saved = await TestAttemptService.saveAnswers(id, ctx.user.id, parsed.data.answers)
      return ok(saved, saved.alreadySubmitted ? 'Attempt already submitted' : 'Answers saved')
    }
    const submission = await TestAttemptService.submitAttempt(
      id,
      ctx.user.id,
      parsed.data.answers,
      parsed.data.submissionType,
    )
    const result = await ResultService.getStudentResult(id, ctx.user.id)
    return ok(
      { ...result, alreadySubmitted: 'alreadySubmitted' in submission && submission.alreadySubmitted === true },
      result.hidden ? 'Test submitted — result awaiting publication' : 'Test submitted and scored',
    )
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields, ctx.requestId)
    throw error
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  try {
    const attempt = await TestAttemptService.getAttempt(id, ctx.user.id)
    if (attempt.status === 'SUBMITTED') {
      const result = await ResultService.getStudentResult(id, ctx.user.id)
      return ok(result, result.hidden ? 'Result awaiting publication' : 'Attempt result')
    }
    return ok({
      attempt: {
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        status: attempt.status,
        remainingSecs: Math.max(0, Math.floor((attempt.expiresAt.getTime() - Date.now()) / 1000)),
      },
      test: { id: attempt.test.id, title: attempt.test.title, durationMins: attempt.test.durationMins },
      questions: attempt.test.questions.map(question => {
        const answer = attempt.answers.find(item => item.questionId === question.id)
        return {
          id: question.id,
          text: question.text,
          marks: question.marks,
          selectedOptionId: answer?.selectedOptionId || null,
          options: question.options.map(option => ({ id: option.id, text: option.text, order: option.order })),
        }
      }),
    }, 'Active attempt')
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields, ctx.requestId)
    throw error
  }
}
