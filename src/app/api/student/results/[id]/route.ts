import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized, notFound, forbidden } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

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
  if (attempt.status !== 'SUBMITTED') return forbidden('Attempt not yet submitted')

  const showResult = attempt.test.showResultImmediately
  const showKey = attempt.test.showAnswerKey
  const passed = attempt.test.passingPct != null ? attempt.percentage >= attempt.test.passingPct : null

  return ok(
    {
      attempt: {
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage,
        timeTakenSecs: attempt.timeTakenSecs,
        submissionType: attempt.submissionType,
        submittedAt: attempt.submittedAt,
        startedAt: attempt.startedAt,
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
