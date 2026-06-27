import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  const now = new Date()
  const userId = ctx.user.id

  // All published tests assigned to batches the student is enrolled in
  const tests = await db.test.findMany({
    where: {
      status: 'PUBLISHED',
      batches: { some: { batch: { enrollments: { some: { userId } } } } },
    },
    orderBy: { startAt: 'asc' },
    include: {
      batches: { include: { batch: { select: { id: true, name: true } } } },
      _count: { select: { questions: true } },
      attempts: {
        where: { userId },
        select: { id: true, attemptNumber: true, status: true, startedAt: true, submittedAt: true, percentage: true },
        orderBy: { attemptNumber: 'desc' },
      },
    },
  })

  const categorized = {
    upcoming: [] as any[],
    active: [] as any[],
    completed: [] as any[],
    attemptLimitReached: [] as any[],
    expired: [] as any[],
  }

  for (const t of tests) {
    const submittedAttempts = t.attempts.filter((a) => a.status === 'SUBMITTED')
    const attemptsUsed = submittedAttempts.length
    const inProgress = t.attempts.find((a) => a.status === 'IN_PROGRESS')

    const entry = {
      id: t.id,
      title: t.title,
      description: t.description,
      durationMins: t.durationMins,
      maxAttempts: t.maxAttempts,
      startAt: t.startAt,
      endAt: t.endAt,
      passingPct: t.passingPct,
      questionCount: t._count.questions,
      batches: t.batches.map((bt) => bt.batch.name),
      attemptsUsed,
      attemptsRemaining: Math.max(0, t.maxAttempts - attemptsUsed),
      inProgressAttempt: inProgress
        ? { id: inProgress.id, startedAt: inProgress.startedAt, expiresAt: inProgress.startedAt ? new Date(inProgress.startedAt.getTime() + t.durationMins * 60 * 1000) : null }
        : null,
      lastAttempt: submittedAttempts[0] || null,
    }

    const started = !t.startAt || t.startAt <= now
    const ended = t.endAt && t.endAt < now
    if (ended && attemptsUsed === 0) {
      categorized.expired.push(entry)
    } else if (!started) {
      categorized.upcoming.push(entry)
    } else if (attemptsUsed >= t.maxAttempts && !inProgress) {
      categorized.attemptLimitReached.push(entry)
    } else if (attemptsUsed > 0 && !inProgress && (!ended || attemptsUsed > 0)) {
      categorized.completed.push(entry)
      if (!ended) categorized.active.push(entry)
    } else {
      categorized.active.push(entry)
    }
  }

  return ok({ ...categorized, all: tests.map((t) => t.id) }, 'Student tests')
}
