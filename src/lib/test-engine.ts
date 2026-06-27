import { db } from './db'

/**
 * Finalize a test attempt (server-side scoring). Idempotent — calling on an
 * already-submitted attempt just returns the existing result.
 *
 * Security:
 * - Score is computed entirely on the server
 * - Runs inside a transaction to prevent duplicate scoring / race conditions
 * - Time-taken is capped at the test's configured duration
 */
export async function finalizeAttempt(
  attemptId: string,
  submissionType: 'MANUAL' | 'AUTO_TIMEOUT' | 'ADMIN_FINALIZED',
  userId: string
) {
  return await db.$transaction(async (tx) => {
    const attempt = await tx.testAttempt.findUnique({ where: { id: attemptId } })
    if (!attempt) throw new Error('Attempt not found')
    if (attempt.status === 'SUBMITTED') return attempt
    if (attempt.userId !== userId) throw new Error('Not your attempt')

    const test = await tx.test.findUnique({
      where: { id: attempt.testId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: true },
        },
      },
    })
    if (!test) throw new Error('Test not found')

    const existingAnswers = await tx.attemptAnswer.findMany({ where: { attemptId } })

    let score = 0
    let totalMarks = 0
    const now = new Date()
    const timeTakenSecs = Math.min(
      test.durationMins * 60,
      Math.max(0, Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000))
    )

    for (const q of test.questions) {
      totalMarks += q.marks
      const ans = existingAnswers.find((a) => a.questionId === q.id)
      if (!ans || !ans.selectedOptionId) {
        if (ans) {
          await tx.attemptAnswer.update({
            where: { id: ans.id },
            data: { isCorrect: false, marksAwarded: 0 },
          })
        }
        continue
      }
      const selected = q.options.find((o) => o.id === ans.selectedOptionId)
      const isCorrect = selected?.isCorrect === true
      const marksAwarded = isCorrect ? q.marks : 0
      score += marksAwarded
      await tx.attemptAnswer.update({
        where: { id: ans.id },
        data: { isCorrect, marksAwarded },
      })
    }

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0
    const finalized = await tx.testAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'SUBMITTED',
        submittedAt: now,
        score,
        totalMarks,
        percentage,
        timeTakenSecs,
        submissionType,
      },
    })
    return finalized
  })
}
