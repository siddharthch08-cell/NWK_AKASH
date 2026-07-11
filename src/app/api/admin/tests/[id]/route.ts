import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { testSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { DomainError, TestPublicationService, ValidationError } from '@/domain'
import { assertDateRange, parseApiDate } from '@/domain/shared/date'

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
  try {
    const finalStart = parsed.data.startAt !== undefined ? parseApiDate(parsed.data.startAt, 'startAt') : existing.startAt
    const finalEnd = parsed.data.endAt !== undefined ? parseApiDate(parsed.data.endAt, 'endAt') : existing.endAt
    assertDateRange(finalStart, finalEnd)
    if (parsed.data.startAt !== undefined) data.startAt = finalStart
    if (parsed.data.endAt !== undefined) data.endAt = finalEnd
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields)
    throw error
  }

  if (parsed.data.status && parsed.data.status !== 'PUBLISHED') data.status = parsed.data.status

  let updated
  try {
    updated = await db.$transaction(async tx => {
      if (parsed.data.batchIds) {
        const batches = await tx.batch.findMany({ where: { id: { in: parsed.data.batchIds } }, select: { id: true } })
        if (batches.length !== new Set(parsed.data.batchIds).size) throw new ValidationError('One or more assigned batches do not exist')
        await tx.testBatch.deleteMany({ where: { testId: id } })
        for (const batchId of new Set(parsed.data.batchIds)) await tx.testBatch.create({ data: { testId: id, batchId } })
      }
      return tx.test.update({ where: { id }, data })
    })
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields)
    throw error
  }
  if (parsed.data.status === 'PUBLISHED') {
    try {
      updated = await TestPublicationService.publishTest(id, { userId: ctx.user.id, role: ctx.user.role, name: ctx.user.name, email: ctx.user.email, status: ctx.user.status, ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId })
    } catch (error) {
      if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields)
      throw error
    }
  }
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
