import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, forbidden, fail } from '@/lib/api-response'
import { attemptSubmitSchema } from '@/lib/validation'
import { finalizeAttempt } from '@/lib/test-engine'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/student/attempts/[id]
 * Body: {
 *   answers: [{ questionId, selectedOptionId (nullable) }],
 *   submissionType: 'MANUAL' | 'AUTO_TIMEOUT',
 *   finalize: boolean  // if false, just save answers without scoring
 * }
 *
 * Security rules per spec:
 * - Score calculated on the backend (NEVER trust client score)
 * - Use a database transaction (in finalizeAttempt)
 * - Lock or atomically update the attempt
 * - Prevent duplicate scoring (idempotent — second submit returns existing result)
 * - Server independently enforces expiry (late submissions finalized with server time)
 * - The timer does not reset after browser refresh (server stores authoritative start)
 */
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = attemptSubmitSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const finalize = (body as any)?.finalize !== false // default true
  const submissionType = parsed.data.submissionType

  // Fetch the attempt
  const attempt = await db.testAttempt.findUnique({
    where: { id },
    include: {
      test: {
        include: {
          questions: { include: { options: true } },
        },
      },
    },
  })
  if (!attempt) return notFound('Attempt not found')
  if (attempt.userId !== ctx.user.id) return forbidden('This is not your attempt')

  // If already submitted, return the existing result (idempotent)
  if (attempt.status === 'SUBMITTED') {
    return ok({ attempt, alreadySubmitted: true }, 'Attempt already submitted')
  }

  // Validate the submitted answers map to real questions in this test
  const validQuestionIds = new Set(attempt.test.questions.map((q) => q.id))
  const validOptionByQuestion = new Map<string, Set<string>>()
  for (const q of attempt.test.questions) {
    validOptionByQuestion.set(q.id, new Set(q.options.map((o) => o.id)))
  }

  for (const ans of parsed.data.answers) {
    if (!validQuestionIds.has(ans.questionId)) {
      return fail('VALIDATION_ERROR', `Unknown questionId: ${ans.questionId}`, 400)
    }
    if (ans.selectedOptionId) {
      const validOpts = validOptionByQuestion.get(ans.questionId)!
      if (!validOpts.has(ans.selectedOptionId)) {
        return fail('VALIDATION_ERROR', `Unknown selectedOptionId: ${ans.selectedOptionId}`, 400)
      }
    }
  }

  // Upsert only supplied answers — preserve previously saved answers not in this request
  const clientAnswersMap = new Map(parsed.data.answers.map((a) => [a.questionId, a.selectedOptionId || null]))

  await db.$transaction(async (tx) => {
    for (const [questionId, selectedOptionId] of clientAnswersMap) {
      const existing = await tx.attemptAnswer.findFirst({
        where: { attemptId: id, questionId },
      })
      if (existing) {
        await tx.attemptAnswer.update({
          where: { id: existing.id },
          data: { selectedOptionId },
        })
      } else {
        await tx.attemptAnswer.create({
          data: {
            attemptId: id,
            questionId,
            selectedOptionId,
            isCorrect: false,
            marksAwarded: 0,
          },
        })
      }
    }
  })

  if (!finalize) {
    return ok({ saved: true }, 'Answers saved')
  }

  // Server-side expiry enforcement: if expired, treat as AUTO_TIMEOUT
  let finalSubmissionType: 'MANUAL' | 'AUTO_TIMEOUT' = submissionType
  if (attempt.expiresAt < new Date()) {
    finalSubmissionType = 'AUTO_TIMEOUT'
  }

  const finalized = await finalizeAttempt(id, finalSubmissionType, ctx.user.id)

  // Fetch fresh with answers + question details for the result view
  const result = await db.testAttempt.findUnique({
    where: { id },
    include: {
      test: {
        select: {
          id: true,
          title: true,
          passingPct: true,
          showAnswerKey: true,
          showResultImmediately: true,
          questions: {
            orderBy: { order: 'asc' },
            include: {
              options: { orderBy: { order: 'asc' } },
            },
          },
        },
      },
      answers: true,
    },
  })

  const showResult = attempt.test.showResultImmediately
  const showKey = attempt.test.showAnswerKey
  const published = !!result!.resultPublishedAt

  // Build the response — only include isCorrect/correct answer when published AND allowed
  const questions = result!.test.questions.map((q) => {
    const ans = result!.answers.find((a) => a.questionId === q.id)
    const base: any = {
      id: q.id,
      text: q.text,
      explanation: (published && showKey) ? q.explanation : undefined,
      marks: q.marks,
      selectedOptionId: ans?.selectedOptionId || null,
      answered: !!ans?.selectedOptionId,
    }
    if (published && showResult) {
      base.isCorrect = ans?.isCorrect
      base.marksAwarded = ans?.marksAwarded
      if (showKey) {
        base.correctOptionId = q.options.find((o) => o.isCorrect)?.id || null
        base.options = q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect }))
      }
    }
    return base
  })

  const passed = (published && attempt.test.passingPct != null) ? result!.percentage >= attempt.test.passingPct : null

  return ok(
    {
      attempt: {
        id: result!.id,
        attemptNumber: result!.attemptNumber,
        score: published ? result!.score : null,
        totalMarks: published ? result!.totalMarks : null,
        percentage: published ? result!.percentage : null,
        timeTakenSecs: published ? result!.timeTakenSecs : null,
        submissionType: result!.submissionType,
        submittedAt: result!.submittedAt,
        passed,
        resultPublished: published,
      },
      test: {
        id: result!.test.id,
        title: result!.test.title,
        showAnswerKey: result!.test.showAnswerKey,
        showResultImmediately: result!.test.showResultImmediately,
        passingPct: result!.test.passingPct,
      },
      questions: published ? questions : [],
      hidden: !published,
    },
    published ? 'Test submitted and scored' : 'Test submitted — result awaiting publication'
  )
}

// GET — fetch an attempt (for resume or result view)
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const attempt = await db.testAttempt.findUnique({
    where: { id },
    include: {
      test: {
        select: {
          id: true,
          title: true,
          durationMins: true,
          passingPct: true,
          showAnswerKey: true,
          showResultImmediately: true,
          questions: {
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
          },
        },
      },
      answers: true,
    },
  })
  if (!attempt) return notFound('Attempt not found')
  if (attempt.userId !== ctx.user.id) return forbidden('This is not your attempt')

  // If IN_PROGRESS and expired, finalize as AUTO_TIMEOUT
  if (attempt.status === 'IN_PROGRESS' && attempt.expiresAt < new Date()) {
    await finalizeAttempt(id, 'AUTO_TIMEOUT', ctx.user.id)
  }

  const fresh = await db.testAttempt.findUnique({ where: { id } })
  const isSubmitted = fresh?.status === 'SUBMITTED'
  const showResult = isSubmitted && attempt.test.showResultImmediately
  const showKey = isSubmitted && attempt.test.showAnswerKey

  if (!isSubmitted) {
    // Return questions without correct answers (for resume)
    return ok(
      {
        attempt: {
          id: attempt.id,
          attemptNumber: attempt.attemptNumber,
          startedAt: attempt.startedAt,
          expiresAt: attempt.expiresAt,
          status: attempt.status,
          remainingSecs: Math.max(0, Math.floor((attempt.expiresAt.getTime() - Date.now()) / 1000)),
        },
        test: {
          id: attempt.test.id,
          title: attempt.test.title,
          durationMins: attempt.test.durationMins,
        },
        questions: attempt.test.questions.map((q) => {
          const ans = attempt.answers.find((a) => a.questionId === q.id)
          return {
            id: q.id,
            text: q.text,
            marks: q.marks,
            selectedOptionId: ans?.selectedOptionId || null,
            options: q.options.map((o) => ({ id: o.id, text: o.text, order: o.order })),
          }
        }),
      },
      'Active attempt'
    )
  }

  // Submitted — return result
  const passed = attempt.test.passingPct != null ? fresh!.percentage >= attempt.test.passingPct : null
  return ok(
    {
      attempt: {
        id: fresh!.id,
        attemptNumber: fresh!.attemptNumber,
        score: fresh!.score,
        totalMarks: fresh!.totalMarks,
        percentage: fresh!.percentage,
        timeTakenSecs: fresh!.timeTakenSecs,
        submissionType: fresh!.submissionType,
        submittedAt: fresh!.submittedAt,
        passed,
      },
      test: {
        id: attempt.test.id,
        title: attempt.test.title,
        showAnswerKey: attempt.test.showAnswerKey,
        showResultImmediately: attempt.test.showResultImmediately,
        passingPct: attempt.test.passingPct,
      },
      questions: attempt.test.questions.map((q) => {
        const ans = attempt.answers.find((a) => a.questionId === q.id)
        const base: any = {
          id: q.id,
          text: q.text,
          marks: q.marks,
          selectedOptionId: ans?.selectedOptionId || null,
          answered: !!ans?.selectedOptionId,
        }
        if (showResult) {
          base.isCorrect = ans?.isCorrect
          base.marksAwarded = ans?.marksAwarded
          if (showKey) {
            base.explanation = q.explanation
            base.correctOptionId = q.options.find((o) => o.isCorrect)?.id || null
            base.options = q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect }))
          }
        }
        return base
      }),
    },
    'Attempt result'
  )
}
