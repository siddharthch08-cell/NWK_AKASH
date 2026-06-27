import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  const active = await db.testAttempt.findFirst({
    where: { userId: ctx.user.id, status: 'IN_PROGRESS' },
    include: {
      test: { select: { id: true, title: true, durationMins: true } },
    },
    orderBy: { startedAt: 'desc' },
  })

  if (!active) return ok({ attempt: null }, 'No active attempt')
  const now = new Date()
  return ok(
    {
      attempt: {
        id: active.id,
        testId: active.testId,
        testTitle: active.test.title,
        durationMins: active.test.durationMins,
        startedAt: active.startedAt,
        expiresAt: active.expiresAt,
        remainingSecs: Math.max(0, Math.floor((active.expiresAt.getTime() - now.getTime()) / 1000)),
        expired: active.expiresAt < now,
      },
    },
    'Active attempt'
  )
}
