import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { testSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const test = await db.test.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, email: true } },
      batches: { include: { batch: { select: { id: true, name: true, slug: true, status: true } } } },
      questions: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
      _count: { select: { attempts: true } },
    },
  })
  if (!test) return notFound('Test not found')
  return ok({ test }, 'Test detail')
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = testSchema.partial().safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const existing = await db.test.findUnique({ where: { id } })
  if (!existing) return notFound('Test not found')

  // Disallow editing critical fields after publication if there are attempts
  const attemptsCount = await db.testAttempt.count({ where: { testId: id, status: 'SUBMITTED' } })
  if (attemptsCount > 0 && parsed.data.durationMins !== undefined && parsed.data.durationMins !== existing.durationMins) {
    return fail('CONFLICT', 'Cannot change duration after attempts have been submitted', 409)
  }

  const data: Record<string, unknown> = {}
  for (const key of [
    'title', 'description', 'instructions', 'durationMins', 'maxAttempts', 'maxQuestions',
    'passingPct', 'shuffleQuestions', 'shuffleOptions', 'showAnswerKey', 'showResultImmediately',
  ] as const) {
    if (parsed.data[key] !== undefined) data[key] = parsed.data[key]
  }
  if (parsed.data.startAt !== undefined) data.startAt = parsed.data.startAt ? new Date(parsed.data.startAt) : null
  if (parsed.data.endAt !== undefined) data.endAt = parsed.data.endAt ? new Date(parsed.data.endAt) : null
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status
    if (parsed.data.status === 'PUBLISHED' && !existing.publishedAt) {
      data.publishedAt = new Date()
    }
  }

  if (data.startAt && data.endAt && new Date(data.startAt as string) > new Date(data.endAt as string)) {
    return fail('VALIDATION_ERROR', 'End date must be after start date', 400, { endAt: 'Must be after startAt' })
  }

  const updated = await db.test.update({ where: { id }, data })
  await audit({ ctx, action: 'TEST_UPDATED', entityType: 'TEST', entityId: id, before: existing, after: updated })
  return ok({ test: updated }, 'Test updated')
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const test = await db.test.findUnique({ where: { id } })
  if (!test) return notFound('Test not found')

  // Only allow hard delete for DRAFT tests with no attempts
  const attemptsCount = await db.testAttempt.count({ where: { testId: id } })
  if (attemptsCount > 0 || test.status !== 'DRAFT') {
    const updated = await db.test.update({ where: { id }, data: { status: 'ARCHIVED' } })
    await audit({ ctx, action: 'TEST_ARCHIVED', entityType: 'TEST', entityId: id, before: { status: test.status }, after: { status: 'ARCHIVED' } })
    return ok({ test: updated }, 'Test archived (cannot hard-delete — has history)')
  }

  await db.test.delete({ where: { id } })
  return ok({}, 'Test deleted')
}
