import { db } from '@/lib/db'
import { ForbiddenError } from '../errors'

const APPROVED_ACCOUNT_STATUSES = new Set(['APPROVED', 'ACTIVE'])
const ACCESSIBLE_BATCH_STATUSES = new Set(['ACTIVE'])

export type AccessDecision<T = undefined> = { allowed: true; value?: T } | { allowed: false; reason: string }

async function accountDecision(userId: string): Promise<AccessDecision> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, status: true, deletedAt: true } })
  if (!user || user.deletedAt || user.role !== 'STUDENT') return { allowed: false, reason: 'Student account not found' }
  if (!APPROVED_ACCOUNT_STATUSES.has(user.status)) return { allowed: false, reason: 'Student account is not approved or active' }
  return { allowed: true }
}

export async function getEnrolledBatchIds(userId: string, activeOnly = true) {
  const rows = await db.batchEnrollment.findMany({
    where: { userId, ...(activeOnly ? { batch: { status: { in: [...ACCESSIBLE_BATCH_STATUSES] } } } : {}) },
    select: { batchId: true },
  })
  return rows.map(row => row.batchId)
}

export async function canAccessBatch(userId: string, batchId: string): Promise<AccessDecision> {
  const account = await accountDecision(userId)
  if (!account.allowed) return account
  const enrollment = await db.batchEnrollment.findUnique({
    where: { batchId_userId: { batchId, userId } },
    select: { batch: { select: { status: true } } },
  })
  if (!enrollment) return { allowed: false, reason: 'You are not enrolled in this batch' }
  if (!ACCESSIBLE_BATCH_STATUSES.has(enrollment.batch.status)) return { allowed: false, reason: `Batch is ${enrollment.batch.status.toLowerCase()}` }
  return { allowed: true }
}

export async function canAccessCourse(userId: string, courseId: string): Promise<AccessDecision<{ batchIds: string[] }>> {
  const account = await accountDecision(userId)
  if (!account.allowed) return account
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      status: true,
      batches: { select: { batchId: true, batch: { select: { status: true } } } },
    },
  })
  if (!course) return { allowed: false, reason: 'Course not found' }
  if (course.status !== 'PUBLISHED') return { allowed: false, reason: 'Course is not published' }
  const eligibleBatchIds = course.batches.filter(link => ACCESSIBLE_BATCH_STATUSES.has(link.batch.status)).map(link => link.batchId)
  const enrollment = await db.batchEnrollment.findMany({ where: { userId, batchId: { in: eligibleBatchIds } }, select: { batchId: true } })
  if (!enrollment.length) return { allowed: false, reason: 'You do not have access to this course' }
  return { allowed: true, value: { batchIds: enrollment.map(row => row.batchId) } }
}

export async function canAccessChapter(userId: string, chapterId: string): Promise<AccessDecision<{ courseId: string }>> {
  const chapter = await db.chapter.findUnique({ where: { id: chapterId }, select: { courseId: true, archivedAt: true } })
  if (!chapter) return { allowed: false, reason: 'Chapter not found' }
  if (chapter.archivedAt) return { allowed: false, reason: 'Chapter is archived' }
  const course = await canAccessCourse(userId, chapter.courseId)
  return course.allowed ? { allowed: true, value: { courseId: chapter.courseId } } : course
}

export async function canAccessTopic(userId: string, topicId: string): Promise<AccessDecision> {
  const topic = await db.topic.findUnique({
    where: { id: topicId },
    select: { archivedAt: true, chapter: { select: { id: true, archivedAt: true } } },
  })
  if (!topic) return { allowed: false, reason: 'Topic not found' }
  if (topic.archivedAt || topic.chapter.archivedAt) return { allowed: false, reason: 'Topic or parent chapter is archived' }
  const chapter = await canAccessChapter(userId, topic.chapter.id)
  return chapter.allowed ? { allowed: true } : chapter
}

export async function canAccessVideo(userId: string, videoId: string): Promise<AccessDecision> {
  const video = await db.video.findUnique({
    where: { id: videoId },
    select: { status: true, archivedAt: true, topic: { select: { id: true, archivedAt: true, chapter: { select: { archivedAt: true } } } } },
  })
  if (!video) return { allowed: false, reason: 'Video not found' }
  if (video.status !== 'PUBLISHED' || video.archivedAt) return { allowed: false, reason: 'Video is not published' }
  if (video.topic.archivedAt || video.topic.chapter.archivedAt) return { allowed: false, reason: 'Video parent is archived' }
  return canAccessTopic(userId, video.topic.id)
}

export async function canAccessMaterial(userId: string, materialId: string): Promise<AccessDecision> {
  const material = await db.material.findUnique({
    where: { id: materialId },
    select: {
      published: true,
      archived: true,
      courseId: true,
      chapter: { select: { archivedAt: true } },
      topic: { select: { archivedAt: true } },
    },
  })
  if (!material) return { allowed: false, reason: 'Material not found' }
  if (!material.published || material.archived) return { allowed: false, reason: 'Material is not published' }
  if (material.chapter.archivedAt || material.topic?.archivedAt) return { allowed: false, reason: 'Material parent is archived' }
  const course = await canAccessCourse(userId, material.courseId)
  return course.allowed ? { allowed: true } : course
}

export async function canAccessTest(userId: string, testId: string): Promise<AccessDecision<{ test: unknown }>> {
  const account = await accountDecision(userId)
  if (!account.allowed) return account
  const test = await db.test.findUnique({
    where: { id: testId },
    include: { batches: { select: { batchId: true, batch: { select: { status: true } } } } },
  })
  if (!test) return { allowed: false, reason: 'Test not found' }
  if (test.status !== 'PUBLISHED') return { allowed: false, reason: 'Test is not published' }
  const now = new Date()
  if (test.startAt && now < test.startAt) return { allowed: false, reason: 'Test has not opened yet' }
  if (test.endAt && now > test.endAt) return { allowed: false, reason: 'Test has expired' }
  const batchIds = test.batches.filter(link => ACCESSIBLE_BATCH_STATUSES.has(link.batch.status)).map(link => link.batchId)
  const enrollment = await db.batchEnrollment.findFirst({ where: { userId, batchId: { in: batchIds } }, select: { id: true } })
  if (!enrollment) return { allowed: false, reason: 'You do not have access to this test' }
  return { allowed: true, value: { test } }
}

export async function canAccessAttempt(userId: string, attemptId: string): Promise<AccessDecision> {
  const account = await accountDecision(userId)
  if (!account.allowed) return account
  const attempt = await db.testAttempt.findUnique({ where: { id: attemptId }, select: { userId: true } })
  if (!attempt) return { allowed: false, reason: 'Attempt not found' }
  return attempt.userId === userId ? { allowed: true } : { allowed: false, reason: 'This is not your attempt' }
}

export async function canAccessResult(userId: string, attemptId: string): Promise<AccessDecision> {
  const ownership = await canAccessAttempt(userId, attemptId)
  if (!ownership.allowed) return ownership
  const attempt = await db.testAttempt.findUnique({ where: { id: attemptId }, select: { status: true, resultPublishedAt: true } })
  if (attempt?.status !== 'SUBMITTED' || !attempt.resultPublishedAt) return { allowed: false, reason: 'Result is not published' }
  return { allowed: true }
}

export async function getAccessibleCourseIds(userId: string) {
  const account = await accountDecision(userId)
  if (!account.allowed) return []
  const batchIds = await getEnrolledBatchIds(userId)
  const rows = await db.batchCourse.findMany({
    where: { batchId: { in: batchIds }, course: { status: 'PUBLISHED' } },
    select: { courseId: true },
    distinct: ['courseId'],
  })
  return rows.map(row => row.courseId)
}

export async function getAccessibleBatches(userId: string) {
  const ids = await getEnrolledBatchIds(userId)
  return db.batch.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true, status: true } })
}

async function assert<T>(decision: Promise<AccessDecision<T>>) {
  const result = await decision
  if (!result.allowed) throw new ForbiddenError(result.reason)
}
export const assertVideoAccess = (userId: string, videoId: string) => assert(canAccessVideo(userId, videoId))
export const assertTestAccess = (userId: string, testId: string) => assert(canAccessTest(userId, testId))
export const assertCourseAccess = (userId: string, courseId: string) => assert(canAccessCourse(userId, courseId))
