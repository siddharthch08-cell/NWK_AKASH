import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { CapacityError, NotFoundError, ValidationError } from '../errors'
import type { AuditContext, PaginatedResult } from '../types'
import { toAuditAuth } from '../types'
import { uniqueIds } from '@/lib/utils'

const ENROLLABLE_BATCH_STATUSES = new Set(['UPCOMING', 'ACTIVE'])
const ACADEMIC_ACCESS_STATUSES = new Set(['APPROVED', 'ACTIVE'])

export interface BatchEnrollmentResult {
  batchId: string
  added: string[]
  alreadyEnrolled: string[]
  rejected: Array<{ userId: string; reason: string }>
  capacityRemaining: number | null
  // Existing route response compatibility.
  enrolled: number
  skipped: number
}

export async function validateBatchCapacity(batchId: string, requestedUserIds: string[]) {
  const ids = uniqueIds(requestedUserIds)
  return db.$transaction(async tx => {
    await tx.$executeRaw`UPDATE "Batch" SET "capacity" = "capacity" WHERE "id" = ${batchId}`
    const batch = await tx.batch.findUnique({ where: { id: batchId }, select: { id: true, capacity: true, status: true } })
    if (!batch) throw new NotFoundError(batchId, 'Batch')
    const existing = await tx.batchEnrollment.findMany({ where: { batchId, userId: { in: ids } }, select: { userId: true } })
    const genuinelyNew = ids.filter(id => !existing.some(row => row.userId === id))
    const count = await tx.batchEnrollment.count({ where: { batchId } })
    const remaining = batch.capacity == null ? null : Math.max(0, batch.capacity - count)
    return { batch, genuinelyNew, capacityRemaining: remaining }
  })
}

export async function assignStudentsToBatch(batchId: string, userIds: string[], ctx: AuditContext): Promise<BatchEnrollmentResult> {
  const ids = uniqueIds(userIds)
  if (!ids.length) throw new ValidationError('At least one student must be provided')

  const result = await db.$transaction(async tx => {
    // A no-op update serializes concurrent capacity checks for this batch.
    await tx.$executeRaw`UPDATE "Batch" SET "capacity" = "capacity" WHERE "id" = ${batchId}`
    const batch = await tx.batch.findUnique({ where: { id: batchId }, select: { id: true, name: true, status: true, capacity: true } })
    if (!batch) throw new NotFoundError(batchId, 'Batch')
    if (!ENROLLABLE_BATCH_STATUSES.has(batch.status)) {
      throw new ValidationError(`Batch ${batch.name} does not accept enrolments`, { batchId: 'Batch must be UPCOMING or ACTIVE' })
    }

    const users = await tx.user.findMany({
      where: { id: { in: ids }, role: 'STUDENT', deletedAt: null },
      select: { id: true, status: true },
    })
    const byId = new Map(users.map(user => [user.id, user]))
    const rejected: Array<{ userId: string; reason: string }> = []
    const eligible: string[] = []
    for (const userId of ids) {
      const user = byId.get(userId)
      if (!user) rejected.push({ userId, reason: 'Student not found' })
      else if (!ACADEMIC_ACCESS_STATUSES.has(user.status)) rejected.push({ userId, reason: 'Student account is not approved' })
      else eligible.push(userId)
    }

    const existing = await tx.batchEnrollment.findMany({ where: { batchId, userId: { in: eligible } }, select: { userId: true } })
    const existingIds = new Set(existing.map(row => row.userId))
    const alreadyEnrolled = eligible.filter(id => existingIds.has(id))
    const newIds = eligible.filter(id => !existingIds.has(id))
    const currentCount = await tx.batchEnrollment.count({ where: { batchId } })
    const capacityRemaining = batch.capacity == null ? null : Math.max(0, batch.capacity - currentCount)
    if (capacityRemaining != null && newIds.length > capacityRemaining) {
      throw new CapacityError(`Batch has ${capacityRemaining} place(s) remaining; ${newIds.length} new enrolment(s) were requested`)
    }
    for (const userId of newIds) await tx.batchEnrollment.create({ data: { batchId, userId } })
    return {
      added: newIds,
      alreadyEnrolled,
      rejected,
      capacityRemaining: capacityRemaining == null ? null : capacityRemaining - newIds.length,
    }
  })

  await audit({
    ctx: toAuditAuth(ctx),
    action: 'BATCH_ENROLLMENTS_ASSIGNED',
    entityType: 'BATCH',
    entityId: batchId,
    after: result,
  })
  return { batchId, ...result, enrolled: result.added.length, skipped: result.alreadyEnrolled.length }
}

export const assignStudentToBatch = (batchId: string, userId: string, ctx: AuditContext) => assignStudentsToBatch(batchId, [userId], ctx)
export const enrollStudents = assignStudentsToBatch

export async function removeStudentFromBatch(batchId: string, userId: string, ctx: AuditContext) {
  const removed = await db.$transaction(async tx => {
    const batch = await tx.batch.findUnique({ where: { id: batchId }, select: { id: true } })
    if (!batch) throw new NotFoundError(batchId, 'Batch')
    return (await tx.batchEnrollment.deleteMany({ where: { batchId, userId } })).count > 0
  })
  if (removed) await audit({ ctx: toAuditAuth(ctx), action: 'ENROLLMENT_REMOVED', entityType: 'BATCH_ENROLLMENT', entityId: `${batchId}:${userId}`, before: { batchId, userId } })
  return { removed }
}

export const removeStudent = removeStudentFromBatch

export async function changeStudentBatch(userId: string, fromBatchId: string, toBatchId: string, ctx: AuditContext) {
  if (fromBatchId === toBatchId) return assignStudentToBatch(toBatchId, userId, ctx)
  const result = await db.$transaction(async tx => {
    await tx.$executeRaw`UPDATE "Batch" SET "capacity" = "capacity" WHERE "id" = ${toBatchId}`
    const [student, target, sourceEnrollment, targetEnrollment] = await Promise.all([
      tx.user.findUnique({ where: { id: userId }, select: { role: true, status: true, deletedAt: true } }),
      tx.batch.findUnique({ where: { id: toBatchId }, select: { id: true, name: true, status: true, capacity: true } }),
      tx.batchEnrollment.findUnique({ where: { batchId_userId: { batchId: fromBatchId, userId } } }),
      tx.batchEnrollment.findUnique({ where: { batchId_userId: { batchId: toBatchId, userId } } }),
    ])
    if (!student || student.role !== 'STUDENT' || student.deletedAt) throw new NotFoundError(userId, 'Student')
    if (!ACADEMIC_ACCESS_STATUSES.has(student.status)) throw new ValidationError('Student account is not approved')
    if (!target) throw new NotFoundError(toBatchId, 'Batch')
    if (!ENROLLABLE_BATCH_STATUSES.has(target.status)) throw new ValidationError(`Batch ${target.name} does not accept enrolments`)
    if (!targetEnrollment && target.capacity != null) {
      const count = await tx.batchEnrollment.count({ where: { batchId: toBatchId } })
      if (count >= target.capacity) throw new CapacityError('Target batch is at capacity')
    }
    if (!targetEnrollment) await tx.batchEnrollment.create({ data: { batchId: toBatchId, userId } })
    if (sourceEnrollment) await tx.batchEnrollment.delete({ where: { id: sourceEnrollment.id } })
    const count = await tx.batchEnrollment.count({ where: { batchId: toBatchId } })
    return { batchId: toBatchId, added: targetEnrollment ? [] : [userId], alreadyEnrolled: targetEnrollment ? [userId] : [], rejected: [], capacityRemaining: target.capacity == null ? null : Math.max(0, target.capacity - count), enrolled: targetEnrollment ? 0 : 1, skipped: targetEnrollment ? 1 : 0 }
  })
  await audit({ ctx: toAuditAuth(ctx), action: 'STUDENT_BATCH_CHANGED', entityType: 'BATCH_ENROLLMENT', entityId: userId, before: { batchId: fromBatchId }, after: { batchId: toBatchId } })
  return result
}

export async function getStudentBatchAssignments(userId: string) {
  return db.batchEnrollment.findMany({
    where: { userId },
    include: { batch: { select: { id: true, name: true, slug: true, status: true, startDate: true, endDate: true } } },
    orderBy: { enrolledAt: 'desc' },
  })
}

export async function getBatchEnrollments(batchId: string, page = 1, pageSize = 20, search?: string): Promise<PaginatedResult<unknown>> {
  const safePage = Math.max(1, page)
  const safeSize = Math.min(100, Math.max(1, pageSize))
  const where = {
    batchId,
    ...(search ? { user: { OR: [{ name: { contains: search } }, { email: { contains: search } }] } } : {}),
  }
  const batch = await db.batch.findUnique({ where: { id: batchId }, select: { id: true } })
  if (!batch) throw new NotFoundError(batchId, 'Batch')
  const [total, items] = await Promise.all([
    db.batchEnrollment.count({ where }),
    db.batchEnrollment.findMany({
      where,
      skip: (safePage - 1) * safeSize,
      take: safeSize,
      include: { user: { select: { id: true, name: true, email: true, phone: true, status: true } } },
      orderBy: [{ enrolledAt: 'desc' }, { id: 'asc' }],
    }),
  ])
  return { items, page: safePage, pageSize: safeSize, total, totalPages: Math.max(1, Math.ceil(total / safeSize)) }
}

export async function getUserBatchIds(userId: string) {
  return (await db.batchEnrollment.findMany({ where: { userId }, select: { batchId: true } })).map(row => row.batchId)
}

export async function isEnrolledInAnyBatch(userId: string, batchIds: string[]) {
  return batchIds.length > 0 && await db.batchEnrollment.count({ where: { userId, batchId: { in: batchIds } } }) > 0
}

export async function getStudentBatches(userId: string) {
  const rows = await getStudentBatchAssignments(userId)
  return rows.map(row => ({ ...row.batch, enrolledAt: row.enrolledAt }))
}

export async function getStudentBatchMemberships(userId: string) {
  const rows = await getStudentBatchAssignments(userId)
  return rows.map(row => ({ batchId: row.batch.id, batchName: row.batch.name, enrolledAt: row.enrolledAt }))
}
