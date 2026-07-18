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
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`UPDATE "TestAttempt" SET "score" = "score" WHERE "id" = ${attemptId}`
    const attempt = await tx.testAttempt.findUnique({ where: { id: attemptId } })
    if (!attempt) throw new Error('Attempt not found')
    if (attempt.status === 'SUBMITTED') return attempt
    if (attempt.userId !== userId) throw new Error('Not your attempt')

    const attemptedQuestionIds: string[] | null = attempt.questionOrder ? JSON.parse(attempt.questionOrder) : null
    const test = await tx.test.findUnique({
      where: { id: attempt.testId },
      include: {
        questions: {
          where: attemptedQuestionIds ? { id: { in: attemptedQuestionIds } } : undefined,
          orderBy: { order: 'asc' },
          include: { options: true },
        },
      },
    })
    if (!test) throw new Error('Test not found')

    const existingAnswers = await tx.attemptAnswer.findMany({ where: { attemptId } })
    const answerByQuestion = new Map(existingAnswers.map(answer => [answer.questionId, answer]))
    let score = 0
    let totalMarks = 0
    const correctAnswerIdsByMarks = new Map<number, string[]>()

    for (const question of test.questions) {
      totalMarks += question.marks
      const answer = answerByQuestion.get(question.id)
      if (!answer?.selectedOptionId) continue
      const selected = question.options.find(option => option.id === answer.selectedOptionId)
      if (selected?.isCorrect !== true) continue
      score += question.marks
      const answerIds = correctAnswerIdsByMarks.get(question.marks) ?? []
      answerIds.push(answer.id)
      correctAnswerIdsByMarks.set(question.marks, answerIds)
    }

    if (existingAnswers.length > 0) {
      await tx.attemptAnswer.updateMany({
        where: { attemptId },
        data: { isCorrect: false, marksAwarded: 0 },
      })
      for (const [marksAwarded, answerIds] of correctAnswerIdsByMarks) {
        await tx.attemptAnswer.updateMany({
          where: { attemptId, id: { in: answerIds } },
          data: { isCorrect: true, marksAwarded },
        })
      }
    }

    const now = new Date()
    const timeTakenSecs = Math.min(
      test.durationMins * 60,
      Math.max(0, Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000))
    )
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
        resultPublishedAt: test.showResultImmediately ? now : null,
      },
    })
    return finalized
  })
}