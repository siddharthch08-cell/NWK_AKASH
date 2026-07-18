import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

type StudentTestEntry = {
  id: string
  title: string
  description: string | null
  durationMins: number
  maxAttempts: number
  startAt: Date | null
  endAt: Date | null
  passingPct: number | null
  questionCount: number
  batches: string[]
  attemptsUsed: number
  attemptsRemaining: number
  inProgressAttempt: { id: string; startedAt: Date; expiresAt: Date } | null
  lastAttempt: {
    id: string
    attemptNumber: number
    status: string
    startedAt: Date
    expiresAt: Date
    submittedAt: Date | null
    percentage: number
  } | null
}

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  const now = new Date()
  const userId = ctx.user.id

  // All published tests assigned to batches the student is enrolled in
  const tests = await db.test.findMany({
    where: {
      status: 'PUBLISHED',
      batches: { some: { batch: { status: 'ACTIVE', enrollments: { some: { userId } } } } },
    },
    orderBy: { startAt: 'asc' },
    include: {
      batches: { where: { batch: { status: 'ACTIVE', enrollments: { some: { userId } } } }, include: { batch: { select: { id: true, name: true } } } },
      _count: { select: { questions: true } },
      attempts: {
        where: { userId },
        select: { id: true, attemptNumber: true, status: true, startedAt: true, expiresAt: true, submittedAt: true, percentage: true },
        orderBy: { attemptNumber: 'desc' },
      },
    },
  })

  const categorized = {
    upcoming: [] as StudentTestEntry[],
    active: [] as StudentTestEntry[],
    completed: [] as StudentTestEntry[],
    attemptLimitReached: [] as StudentTestEntry[],
    expired: [] as StudentTestEntry[],
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
        ? { id: inProgress.id, startedAt: inProgress.startedAt, expiresAt: inProgress.expiresAt }
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
    } else if (attemptsUsed > 0 && !inProgress && ended) {
      categorized.completed.push(entry)
    } else {
      categorized.active.push(entry)
    }
  }

  return ok({ ...categorized, all: tests.map((t) => t.id) }, 'Student tests')
}
