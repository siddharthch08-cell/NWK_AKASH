import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { BatchCourseService, EnrollmentService, TestAttemptService } from '@/domain'

let dbOk = false

describe.sequential('Phase 2 database concurrency integration', () => {
  const key = `p2-${randomUUID()}`
  const adminId = `${key}-admin`
  const studentIds = [`${key}-s1`, `${key}-s2`, `${key}-pending`]
  const capacityBatchId = `${key}-capacity`
  const attemptBatchId = `${key}-attempt-batch`
  const completedBatchId = `${key}-completed`
  const paginationBatchId = `${key}-pagination`
  const courseId = `${key}-course`
  const testId = `${key}-test`
  const questionId = `${key}-question`
  const optionIds = [`${key}-o1`, `${key}-o2`]
  const ctx = { userId: adminId, role: 'ADMIN' as const, name: 'Phase 2 Admin', email: `${key}@test.local`, status: 'ACTIVE' }

  beforeAll(async () => {
    try {
      await db.$queryRaw`SELECT 1`
      dbOk = true
    } catch {
      dbOk = false
      return
    }

    await db.user.create({ data: { id: adminId, email: `${key}@test.local`, passwordHash: 'test', role: 'ADMIN', name: 'Phase 2 Admin', status: 'ACTIVE' } })
    await db.user.createMany({ data: [
      { id: studentIds[0], email: `${key}-1@test.local`, passwordHash: 'test', role: 'STUDENT', name: 'Student 1', status: 'APPROVED' },
      { id: studentIds[1], email: `${key}-2@test.local`, passwordHash: 'test', role: 'STUDENT', name: 'Student 2', status: 'APPROVED' },
      { id: studentIds[2], email: `${key}-3@test.local`, passwordHash: 'test', role: 'STUDENT', name: 'Pending', status: 'PENDING' },
    ] })
    await db.batch.createMany({ data: [
      { id: capacityBatchId, name: 'Capacity', slug: `${key}-capacity`, status: 'ACTIVE', capacity: 1, createdBy: adminId },
      { id: attemptBatchId, name: 'Attempts', slug: `${key}-attempt`, status: 'ACTIVE', createdBy: adminId },
      { id: completedBatchId, name: 'Completed', slug: `${key}-completed`, status: 'COMPLETED', createdBy: adminId },
      { id: paginationBatchId, name: 'Pagination', slug: `${key}-pagination`, status: 'ACTIVE', createdBy: adminId },
    ] })
    await db.course.create({ data: { id: courseId, title: 'Course', slug: `${key}-course`, status: 'PUBLISHED', createdBy: adminId } })
  }, 60_000)

  afterAll(async () => {
    if (!dbOk) return
    await db.test.deleteMany({ where: { id: { startsWith: key } } })
    await db.course.deleteMany({ where: { id: { startsWith: key } } })
    await db.batch.deleteMany({ where: { id: { startsWith: key } } })
    await db.auditLog.deleteMany({ where: { actorId: adminId } })
    await db.user.deleteMany({ where: { id: { startsWith: key } } })
  }, 60_000)

  it.skipIf(!dbOk)('cannot over-enroll under concurrent requests and rejects pending access', async () => {
    await Promise.allSettled(studentIds.slice(0, 2).map(userId => EnrollmentService.assignStudentToBatch(capacityBatchId, userId, ctx)))
    expect(await db.batchEnrollment.count({ where: { batchId: capacityBatchId } })).toBe(1)
    const pending = await EnrollmentService.assignStudentToBatch(attemptBatchId, studentIds[2], ctx)
    expect(pending.added).toEqual([])
    expect(pending.rejected[0]?.reason).toContain('not approved')
  }, 60_000)

  it.skipIf(!dbOk)('makes both course assignment directions idempotent and preserves completed links on sync', async () => {
    expect((await BatchCourseService.assignCoursesToBatch(attemptBatchId, [courseId, courseId], ctx)).added).toBe(1)
    expect((await BatchCourseService.assignBatchesToCourse(courseId, [attemptBatchId], ctx)).added).toBe(0)
    await db.batchCourse.create({ data: { batchId: completedBatchId, courseId } })
    await BatchCourseService.synchronizeCourseBatches(courseId, [], ctx)
    const links = await db.batchCourse.findMany({ where: { courseId }, select: { batchId: true } })
    expect(links.map(link => link.batchId)).toEqual([completedBatchId])
  })

  it.skipIf(!dbOk)('creates one logical attempt under concurrent starts and keeps the highest answer revision', async () => {
    await EnrollmentService.assignStudentToBatch(attemptBatchId, studentIds[0], ctx)
    await db.test.create({ data: { id: testId, title: 'Concurrent test', durationMins: 30, maxAttempts: 2, maxQuestions: 10, status: 'PUBLISHED', createdBy: adminId, batches: { create: { batchId: attemptBatchId } }, questions: { create: { id: questionId, text: 'Question', marks: 1, options: { create: [{ id: optionIds[0], text: 'A', isCorrect: true }, { id: optionIds[1], text: 'B', isCorrect: false }] } } } } })
    const starts = await Promise.all([TestAttemptService.startAttempt(testId, studentIds[0]), TestAttemptService.startAttempt(testId, studentIds[0])])
    expect(new Set(starts.map(result => result.attempt.id)).size).toBe(1)
    expect(await db.testAttempt.count({ where: { testId, userId: studentIds[0] } })).toBe(1)
    const attemptId = starts[0].attempt.id
    await TestAttemptService.saveAnswers(attemptId, studentIds[0], [{ questionId, selectedOptionId: optionIds[1], revision: 2 }])
    await TestAttemptService.saveAnswers(attemptId, studentIds[0], [{ questionId, selectedOptionId: optionIds[0], revision: 1 }])
    const answer = await db.attemptAnswer.findUnique({ where: { attemptId_questionId: { attemptId, questionId } } })
    expect(answer?.selectedOptionId).toBe(optionIds[1])
    expect(answer?.revision).toBe(2)
    expect(await db.attemptAnswer.count({ where: { attemptId, questionId } })).toBe(1)
  }, 60_000)

  it.skipIf(!dbOk)('returns navigable enrollment pages and the actual total beyond 100 students', async () => {
    const ids = Array.from({ length: 105 }, (_, index) => `${key}-page-${index}`)
    await db.user.createMany({ data: ids.map((id, index) => ({ id, email: `${key}-page-${index}@test.local`, passwordHash: 'test', role: 'STUDENT', name: `Page Student ${index}`, status: 'APPROVED' })) })
    const assigned = await EnrollmentService.assignStudentsToBatch(paginationBatchId, ids, ctx)
    expect(assigned.added).toHaveLength(105)
    const page = await EnrollmentService.getBatchEnrollments(paginationBatchId, 6, 20)
    expect(page.total).toBe(105)
    expect(page.totalPages).toBe(6)
    expect(page.items).toHaveLength(5)
  }, 60_000)
})
