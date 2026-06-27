import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized, notFound, forbidden, fail } from '@/lib/api-response'
import { finalizeAttempt } from '@/lib/test-engine'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/student/tests/[id]/start
 *
 * Security rules per spec:
 * - Student account is approved and active (requireActiveStudent middleware)
 * - Student is assigned to an authorized batch
 * - Test is published
 * - Test is within availability window
 * - Attempt limit is not exhausted
 * - No invalid active attempt exists
 * - Test contains valid questions
 *
 * On start:
 * - Create attempt server-side
 * - Save authoritative start time (server clock — not client)
 * - Calculate authoritative expiry time (server clock)
 * - Return questions WITHOUT correct-answer metadata
 */
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const now = new Date()

  const test = await db.test.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
      _count: { select: { questions: true } },
    },
  })
  if (!test || test.status !== 'PUBLISHED') return notFound('Test not found')

  // Verify batch access
  const hasAccess = await db.batchEnrollment.findFirst({
    where: {
      userId: ctx.user.id,
      batch: { tests: { some: { testId: id } } },
    },
  })
  if (!hasAccess) return forbidden('You do not have access to this test')

  // Availability window
  if (test.startAt && now < test.startAt) {
    return fail('TEST_NOT_AVAILABLE', 'This test has not opened yet', 400)
  }
  if (test.endAt && now > test.endAt) {
    return fail('TEST_EXPIRED', 'This test is no longer available', 400)
  }

  if (test._count.questions === 0) {
    return fail('TEST_EMPTY', 'This test has no questions', 400)
  }

  // Check for an existing IN_PROGRESS attempt — if so, resume it
  const existing = await db.testAttempt.findFirst({
    where: { testId: id, userId: ctx.user.id, status: 'IN_PROGRESS' },
  })
  if (existing) {
    if (existing.expiresAt < now) {
      await finalizeAttempt(existing.id, 'AUTO_TIMEOUT', ctx.user.id)
    } else {
      return ok(
        {
          attempt: {
            id: existing.id,
            attemptNumber: existing.attemptNumber,
            startedAt: existing.startedAt,
            expiresAt: existing.expiresAt,
            durationMins: test.durationMins,
            remainingSecs: Math.max(0, Math.floor((existing.expiresAt.getTime() - now.getTime()) / 1000)),
          },
          test: {
            id: test.id,
            title: test.title,
            instructions: test.instructions,
            durationMins: test.durationMins,
            showResultImmediately: test.showResultImmediately,
            passingPct: test.passingPct,
          },
          questions: test.questions.map((q) => ({
            id: q.id,
            text: q.text,
            marks: q.marks,
            order: q.order,
            options: q.options.map((o) => ({ id: o.id, text: o.text, order: o.order })),
          })),
          resumed: true,
        },
        'Resumed active attempt'
      )
    }
  }

  const submittedCount = await db.testAttempt.count({
    where: { testId: id, userId: ctx.user.id, status: 'SUBMITTED' },
  })
  if (submittedCount >= test.maxAttempts) {
    return fail('ATTEMPT_LIMIT_REACHED', `You have used all ${test.maxAttempts} attempt(s) for this test`, 400)
  }

  const attemptNumber = submittedCount + 1
  const startedAt = now
  const expiresAt = new Date(now.getTime() + test.durationMins * 60 * 1000)

  const attempt = await db.testAttempt.create({
    data: {
      testId: id,
      userId: ctx.user.id,
      attemptNumber,
      startedAt,
      expiresAt,
      status: 'IN_PROGRESS',
      totalMarks: test.questions.reduce((sum, q) => sum + q.marks, 0),
    },
  })

  return ok(
    {
      attempt: {
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        durationMins: test.durationMins,
        remainingSecs: Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)),
      },
      test: {
        id: test.id,
        title: test.title,
        instructions: test.instructions,
        durationMins: test.durationMins,
        showResultImmediately: test.showResultImmediately,
        passingPct: test.passingPct,
      },
      questions: test.questions.map((q) => ({
        id: q.id,
        text: q.text,
        marks: q.marks,
        order: q.order,
        options: q.options.map((o) => ({ id: o.id, text: o.text, order: o.order })),
      })),
      resumed: false,
    },
    'Test attempt started',
    undefined,
    201
  )
}
