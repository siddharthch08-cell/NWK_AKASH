/**
 * ResultService — result visibility and publication logic.
 *
 * Consolidates:
 *  - GET /api/student/results/[id]
 *  - POST /api/admin/tests/[id]/publish-results
 *  - POST /api/admin/tests/[id]/unpublish-results
 *  - GET /api/admin/tests/[id]/submissions
 *
 * Ensures results are only visible when published.
 */

import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { NotFoundError, ForbiddenError } from './errors'
import type { AuditContext } from './types'
import { toAuditAuth } from './types'

/**
 * Check if a result is visible to a student.
 */
export async function isResultVisible(attemptId: string, userId: string): Promise<boolean> {
  const attempt = await db.testAttempt.findUnique({
    where: { id: attemptId },
    select: { userId: true, resultPublishedAt: true },
  })
  if (!attempt) return false
  if (attempt.userId !== userId) return false
  return attempt.resultPublishedAt !== null
}

/**
 * Get a student's result (only if published).
 */
export async function getStudentResult(attemptId: string, userId: string) {
  const attempt = await db.testAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      attemptNumber: true,
      submittedAt: true,
      resultPublishedAt: true,
      questionOrder: true,
      score: true,
      totalMarks: true,
      percentage: true,
      timeTakenSecs: true,
      submissionType: true,
      test: {
        select: {
          id: true,
          title: true,
          passingPct: true,
          showAnswerKey: true,
          showResultImmediately: true,
        },
      },
    },
  })
  if (!attempt) throw new NotFoundError(attemptId, 'Attempt')
  if (attempt.userId !== userId) throw new ForbiddenError('This is not your attempt')

  const published = !!attempt.resultPublishedAt
  if (!published) {
    return {
      attempt: {
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        submittedAt: attempt.submittedAt,
        resultPublished: false,
      },
      test: { id: attempt.test.id, title: attempt.test.title },
      questions: [],
      hidden: true as const,
    }
  }

  const questionOrder: string[] | null = attempt.questionOrder ? JSON.parse(attempt.questionOrder) : null
  const questionWhere = {
    testId: attempt.test.id,
    ...(questionOrder?.length ? { id: { in: questionOrder } } : {}),
  }
  const showKey = attempt.test.showAnswerKey

  let questions: Array<{
    id: string
    text: string
    explanation?: string | null
    marks: number
    selectedOptionId: string | null
    answered: boolean
    isCorrect?: boolean
    marksAwarded?: number
    correctOptionId?: string | null
    options?: Array<{ id: string; text: string; isCorrect: boolean }>
  }>

  if (showKey) {
    const [testQuestions, answers] = await Promise.all([
      db.question.findMany({
        where: questionWhere,
        orderBy: { order: 'asc' },
        select: {
          id: true,
          text: true,
          explanation: true,
          marks: true,
          options: { orderBy: { order: 'asc' }, select: { id: true, text: true, isCorrect: true } },
        },
      }),
      db.attemptAnswer.findMany({
        where: { attemptId },
        select: { questionId: true, selectedOptionId: true, isCorrect: true, marksAwarded: true },
      }),
    ])
    const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]))
    const questionById = new Map(testQuestions.map((question) => [question.id, question]))
    const orderedQuestions = questionOrder
      ? questionOrder.flatMap((id) => {
          const question = questionById.get(id)
          return question ? [question] : []
        })
      : testQuestions
    questions = orderedQuestions.map((question) => {
      const answer = answerByQuestion.get(question.id)
      return {
        id: question.id,
        text: question.text,
        explanation: question.explanation,
        marks: question.marks,
        selectedOptionId: answer?.selectedOptionId || null,
        answered: !!answer?.selectedOptionId,
        isCorrect: answer?.isCorrect,
        marksAwarded: answer?.marksAwarded,
        correctOptionId: question.options.find((option) => option.isCorrect)?.id || null,
        options: question.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
      }
    })
  } else {
    const [testQuestions, answers] = await Promise.all([
      db.question.findMany({
        where: questionWhere,
        orderBy: { order: 'asc' },
        select: { id: true, text: true, marks: true },
      }),
      db.attemptAnswer.findMany({
        where: { attemptId },
        select: { questionId: true, selectedOptionId: true },
      }),
    ])
    const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]))
    const questionById = new Map(testQuestions.map((question) => [question.id, question]))
    const orderedQuestions = questionOrder
      ? questionOrder.flatMap((id) => {
          const question = questionById.get(id)
          return question ? [question] : []
        })
      : testQuestions
    questions = orderedQuestions.map((question) => {
      const answer = answerByQuestion.get(question.id)
      return {
        id: question.id,
        text: question.text,
        marks: question.marks,
        selectedOptionId: answer?.selectedOptionId || null,
        answered: !!answer?.selectedOptionId,
      }
    })
  }

  const passed = attempt.test.passingPct != null
    ? attempt.percentage >= attempt.test.passingPct
    : null

  return {
    attempt: {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      percentage: attempt.percentage,
      timeTakenSecs: attempt.timeTakenSecs,
      submissionType: attempt.submissionType,
      submittedAt: attempt.submittedAt,
      passed,
      resultPublished: true,
    },
    test: {
      id: attempt.test.id,
      title: attempt.test.title,
      showAnswerKey: attempt.test.showAnswerKey,
      showResultImmediately: attempt.test.showResultImmediately,
      passingPct: attempt.test.passingPct,
    },
    questions,
    hidden: false as const,
  }
}
export async function getStudentResults(userId: string) {
  const attempts = await db.testAttempt.findMany({
    where: { userId, status: 'SUBMITTED' },
    orderBy: { submittedAt: 'desc' },
    include: { test: { select: { id: true, title: true, passingPct: true } } },
  })
  const items = attempts.map(attempt => {
    const published = !!attempt.resultPublishedAt
    return {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      testId: attempt.testId,
      submittedAt: attempt.submittedAt,
      resultPublished: published,
      ...(published
        ? { score: attempt.score, totalMarks: attempt.totalMarks, percentage: attempt.percentage, timeTakenSecs: attempt.timeTakenSecs }
        : { score: null, totalMarks: null, percentage: null, timeTakenSecs: null }),
      test: attempt.test,
    }
  })
  const published = attempts.filter(attempt => !!attempt.resultPublishedAt)
  return {
    attempts: items,
    stats: {
      total: attempts.length,
      published: published.length,
      avgScore: published.length ? Math.round(published.reduce((sum, attempt) => sum + attempt.percentage, 0) / published.length) : 0,
      bestScore: published.length ? Math.max(...published.map(attempt => attempt.percentage)) : 0,
    },
  }
}

/**
 * Publish all results for a test.
 */
export async function publishResults(testId: string, ctx: AuditContext) {
  const test = await db.test.findUnique({ where: { id: testId } })
  if (!test) throw new NotFoundError(testId, 'Test')

  const result = await db.testAttempt.updateMany({
    where: { testId, status: 'SUBMITTED', resultPublishedAt: null },
    data: { resultPublishedAt: new Date() },
  })

  await audit({
    ctx: toAuditAuth(ctx),
    action: 'RESULTS_PUBLISHED',
    entityType: 'TEST',
    entityId: testId,
    after: { count: result.count },
  })

  return { published: result.count }
}

/**
 * Unpublish all results for a test.
 */
export async function unpublishResults(testId: string, ctx: AuditContext) {
  const test = await db.test.findUnique({ where: { id: testId } })
  if (!test) throw new NotFoundError(testId, 'Test')

  const result = await db.testAttempt.updateMany({
    where: { testId, status: 'SUBMITTED', resultPublishedAt: { not: null } },
    data: { resultPublishedAt: null },
  })

  await audit({
    ctx: toAuditAuth(ctx),
    action: 'RESULTS_UNPUBLISHED',
    entityType: 'TEST',
    entityId: testId,
    before: { count: result.count },
  })

  return { unpublished: result.count }
}

/**
 * Get submissions for a test (admin view).
 */
export async function getTestSubmissions(
  testId: string,
  page = 1,
  pageSize = 20,
) {
  const test = await db.test.findUnique({ where: { id: testId } })
  if (!test) throw new NotFoundError(testId, 'Test')

  const where = { testId, status: 'SUBMITTED' as const }

  const [total, items] = await Promise.all([
    db.testAttempt.count({ where }),
    db.testAttempt.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { submittedAt: 'desc' },
    }),
  ])

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}
