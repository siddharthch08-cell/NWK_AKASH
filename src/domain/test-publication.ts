import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { NotFoundError, ValidationError } from './errors'
import type { AuditContext, TxClient } from './types'
import { toAuditAuth } from './types'

const ELIGIBLE_BATCH_STATUSES = new Set(['UPCOMING', 'ACTIVE'])

async function collectPublicationErrors(tx: TxClient, testId: string) {
  const test = await tx.test.findUnique({
    where: { id: testId },
    include: {
      questions: { include: { options: true }, orderBy: { order: 'asc' } },
      batches: { include: { batch: { select: { id: true, name: true, status: true } } } },
    },
  })
  if (!test) throw new NotFoundError(testId, 'Test')
  const errors: string[] = []
  if (!test.questions.length) errors.push('Test must have at least one question')
  for (const [index, question] of test.questions.entries()) {
    const label = `Question ${index + 1}`
    if (!question.text.trim()) errors.push(`${label} has no text`)
    if (!Number.isInteger(question.marks) || question.marks <= 0) errors.push(`${label} must have positive integer marks`)
    if (question.options.length < 2) errors.push(`${label} must have at least two options`)
    if (question.options.some(option => !option.text.trim())) errors.push(`${label} has an empty option`)
    const correct = question.options.filter(option => option.isCorrect).length
    if (correct !== 1) errors.push(`${label} must have exactly one correct option`)
  }
  if (!Number.isInteger(test.durationMins) || test.durationMins < 1 || test.durationMins > 300) errors.push('Duration must be between 1 and 300 minutes')
  if (!Number.isInteger(test.maxAttempts) || test.maxAttempts < 1) errors.push('Maximum attempts must be positive')
  if (test.passingPct != null && (test.passingPct < 0 || test.passingPct > 100)) errors.push('Passing percentage must be between 0 and 100')
  if (test.startAt && test.endAt && test.startAt >= test.endAt) errors.push('Test end date must be after its start date')
  if (!test.batches.length) errors.push('Test must be assigned to at least one eligible batch')
  for (const link of test.batches) {
    if (!ELIGIBLE_BATCH_STATUSES.has(link.batch.status)) errors.push(`Batch ${link.batch.name} is not UPCOMING or ACTIVE`)
  }
  return { test, errors }
}

export async function validateTestForPublication(testId: string) {
  const { errors } = await db.$transaction(tx => collectPublicationErrors(tx, testId))
  return { valid: errors.length === 0, errors }
}

export async function publishTest(testId: string, ctx: AuditContext) {
  const { before, updated } = await db.$transaction(async tx => {
    const { test, errors } = await collectPublicationErrors(tx, testId)
    if (errors.length) throw new ValidationError(`Test cannot be published: ${errors.join('; ')}`)
    const updated = await tx.test.update({ where: { id: testId }, data: { status: 'PUBLISHED', publishedAt: test.publishedAt || new Date() } })
    return { before: test, updated }
  })
  await audit({ ctx: toAuditAuth(ctx), action: 'TEST_PUBLISHED', entityType: 'TEST', entityId: testId, before: { status: before.status }, after: { status: updated.status } })
  return updated
}

export async function unpublishTest(testId: string, ctx: AuditContext) {
  const test = await db.test.findUnique({ where: { id: testId } })
  if (!test) throw new NotFoundError(testId, 'Test')
  const updated = await db.test.update({ where: { id: testId }, data: { status: 'DRAFT' } })
  await audit({ ctx: toAuditAuth(ctx), action: 'TEST_UNPUBLISHED', entityType: 'TEST', entityId: testId, before: { status: test.status }, after: { status: 'DRAFT' } })
  return updated
}

export async function getPublicationStatus(testId: string) {
  const result = await validateTestForPublication(testId)
  const test = await db.test.findUnique({ where: { id: testId }, select: { id: true, title: true, status: true } })
  if (!test) throw new NotFoundError(testId, 'Test')
  return { test, ready: result.valid, issues: result.errors }
}
