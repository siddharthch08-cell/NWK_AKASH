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
      hidden: true,
    }
  }

  const showResult = published
  const showKey = attempt.test.showAnswerKey

  const questions = showResult
    ? attempt.test.questions.map(q => {
        const ans = attempt.answers.find(a => a.questionId === q.id)
        const base: any = {
          id: q.id,
          text: q.text,
          explanation: showKey ? q.explanation : undefined,
          marks: q.marks,
          selectedOptionId: ans?.selectedOptionId || null,
          answered: !!ans?.selectedOptionId,
        }
        if (showResult) {
          base.isCorrect = ans?.isCorrect
          base.marksAwarded = ans?.marksAwarded
          if (showKey) {
            base.correctOptionId = q.options.find(o => o.isCorrect)?.id || null
            base.options = q.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect }))
          }
        }
        return base
      })
    : []

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
    hidden: false,
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
