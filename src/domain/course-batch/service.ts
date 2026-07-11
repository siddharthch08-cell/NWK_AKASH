import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { NotFoundError, ValidationError } from '../errors'
import type { AssignmentResult, AuditContext, TxClient } from '../types'
import { toAuditAuth } from '../types'
import { uniqueIds } from '@/lib/utils'

const ASSIGNABLE_BATCH_STATUSES = new Set(['UPCOMING', 'ACTIVE'])
const ASSIGNABLE_COURSE_STATUSES = new Set(['DRAFT', 'PUBLISHED'])

export async function validateCourseBatchAssignment(
  tx: TxClient,
  batchId: string,
  courseId: string,
) {
  const [batch, course] = await Promise.all([
    tx.batch.findUnique({ where: { id: batchId }, select: { id: true, name: true, status: true } }),
    tx.course.findUnique({ where: { id: courseId }, select: { id: true, title: true, status: true } }),
  ])
  if (!batch) throw new NotFoundError(batchId, 'Batch')
  if (!course) throw new NotFoundError(courseId, 'Course')
  if (!ASSIGNABLE_BATCH_STATUSES.has(batch.status)) {
    throw new ValidationError(`Batch ${batch.name} is not assignable`, { batchId: 'Batch must be UPCOMING or ACTIVE' })
  }
  if (!ASSIGNABLE_COURSE_STATUSES.has(course.status)) {
    throw new ValidationError(`Course ${course.title} is not assignable`, { courseId: 'Course must be DRAFT or PUBLISHED' })
  }
  return { batch, course }
}

async function assignPairs(pairs: Array<{ batchId: string; courseId: string }>) {
  return db.$transaction(async (tx) => {
    let added = 0
    for (const pair of pairs) {
      await validateCourseBatchAssignment(tx, pair.batchId, pair.courseId)
      const existing = await tx.batchCourse.findUnique({ where: { batchId_courseId: pair } })
      if (!existing) {
        await tx.batchCourse.create({ data: pair })
        added++
      }
    }
    return added
  })
}

export async function assignCoursesToBatch(batchId: string, courseIds: string[], ctx: AuditContext): Promise<AssignmentResult> {
  const ids = uniqueIds(courseIds)
  const added = await assignPairs(ids.map(courseId => ({ batchId, courseId })))
  await audit({ ctx: toAuditAuth(ctx), action: 'COURSE_BATCH_ASSIGNMENTS_ADDED', entityType: 'BATCH', entityId: batchId, after: { courseIds: ids, added } })
  return { added, removed: 0 }
}

export async function assignBatchesToCourse(courseId: string, batchIds: string[], ctx: AuditContext): Promise<AssignmentResult> {
  const ids = uniqueIds(batchIds)
  const added = await assignPairs(ids.map(batchId => ({ batchId, courseId })))
  await audit({ ctx: toAuditAuth(ctx), action: 'COURSE_BATCH_ASSIGNMENTS_ADDED', entityType: 'COURSE', entityId: courseId, after: { batchIds: ids, added } })
  return { added, removed: 0 }
}

export async function unassignCourseFromBatch(batchId: string, courseId: string, ctx: AuditContext) {
  const removed = await db.$transaction(async (tx) => {
    const batch = await tx.batch.findUnique({ where: { id: batchId }, select: { id: true } })
    const course = await tx.course.findUnique({ where: { id: courseId }, select: { id: true } })
    if (!batch) throw new NotFoundError(batchId, 'Batch')
    if (!course) throw new NotFoundError(courseId, 'Course')
    return (await tx.batchCourse.deleteMany({ where: { batchId, courseId } })).count > 0
  })
  if (removed) await audit({ ctx: toAuditAuth(ctx), action: 'COURSE_BATCH_ASSIGNMENT_REMOVED', entityType: 'BATCH_COURSE', entityId: `${batchId}:${courseId}`, before: { batchId, courseId } })
  return { removed }
}

export async function synchronizeCourseBatches(
  courseId: string,
  desiredBatchIds: string[],
  ctx: AuditContext,
  editableStatuses: string[] = ['UPCOMING', 'ACTIVE'],
): Promise<AssignmentResult> {
  const desired = uniqueIds(desiredBatchIds)
  const editable = new Set(editableStatuses)
  const result = await db.$transaction(async (tx) => {
    const course = await tx.course.findUnique({ where: { id: courseId }, select: { id: true, status: true, title: true } })
    if (!course) throw new NotFoundError(courseId, 'Course')
    if (!ASSIGNABLE_COURSE_STATUSES.has(course.status)) throw new ValidationError('Archived courses cannot be assigned')
    const current = await tx.batchCourse.findMany({
      where: { courseId },
      select: { batchId: true, batch: { select: { status: true } } },
    })
    const editableCurrent = current.filter(link => editable.has(link.batch.status)).map(link => link.batchId)
    const currentIds = new Set(current.map(link => link.batchId))
    for (const batchId of desired) {
      const existing = current.find(link => link.batchId === batchId)
      if (!existing || editable.has(existing.batch.status)) await validateCourseBatchAssignment(tx, batchId, courseId)
    }
    const desiredIds = new Set(desired)
    const toAdd = desired.filter(id => !currentIds.has(id))
    const toRemove = editableCurrent.filter(id => !desiredIds.has(id))
    if (toRemove.length) await tx.batchCourse.deleteMany({ where: { courseId, batchId: { in: toRemove } } })
    for (const batchId of toAdd) await tx.batchCourse.create({ data: { batchId, courseId } })
    return { added: toAdd.length, removed: toRemove.length }
  })
  await audit({ ctx: toAuditAuth(ctx), action: 'COURSE_BATCH_ASSIGNMENTS_SYNCHRONIZED', entityType: 'COURSE', entityId: courseId, after: { desiredBatchIds: desired, editableStatuses, ...result } })
  return result
}

export async function getCourseBatchAssignments(input: { courseId?: string; batchId?: string }) {
  if (!input.courseId && !input.batchId) throw new ValidationError('courseId or batchId is required')
  return db.batchCourse.findMany({
    where: { courseId: input.courseId, batchId: input.batchId },
    include: {
      batch: { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
      course: { select: { id: true, title: true, status: true } },
    },
    orderBy: [{ batchId: 'asc' }, { courseId: 'asc' }],
  })
}

// Compatibility names used by the existing route wrappers.
export const removeCourseFromBatch = unassignCourseFromBatch
export const syncCourseBatches = synchronizeCourseBatches
export const getCourseBatches = (courseId: string) => getCourseBatchAssignments({ courseId })
export const getBatchCourses = (batchId: string) => getCourseBatchAssignments({ batchId })
