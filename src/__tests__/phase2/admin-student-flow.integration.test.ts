import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { BatchCourseService, ContentLifecycleService, EnrollmentService, MaterialService, StudentContentAccessPolicy, TestAttemptService, TestPublicationService } from '@/domain'

describe.sequential('Phase 2 admin and student workflow integration', () => {
  const key = `p2-flow-${randomUUID()}`
  const ids = {
    admin: `${key}-admin`, student: `${key}-student`, outsider: `${key}-outsider`,
    batch: `${key}-batch`, otherBatch: `${key}-other-batch`, course: `${key}-course`,
    chapter: `${key}-chapter`, topic: `${key}-topic`, video: `${key}-video`, test: `${key}-test`,
    question: `${key}-question`, correct: `${key}-correct`, wrong: `${key}-wrong`,
  }
  const ctx = { userId: ids.admin, role: 'ADMIN' as const, name: 'Admin', email: `${key}@test.local`, status: 'ACTIVE' }
  let materialId = ''

  beforeAll(async () => {
    await db.user.create({ data: { id: ids.admin, email: `${key}@test.local`, passwordHash: 'test', role: 'ADMIN', name: 'Admin', status: 'ACTIVE' } })
    await db.user.createMany({ data: [
      { id: ids.student, email: `${key}-student@test.local`, passwordHash: 'test', role: 'STUDENT', name: 'Student', status: 'APPROVED' },
      { id: ids.outsider, email: `${key}-outsider@test.local`, passwordHash: 'test', role: 'STUDENT', name: 'Outsider', status: 'APPROVED' },
    ] })
    await db.batch.createMany({ data: [
      { id: ids.batch, name: 'Main batch', slug: `${key}-main`, status: 'ACTIVE', createdBy: ids.admin },
      { id: ids.otherBatch, name: 'Other batch', slug: `${key}-other`, status: 'ACTIVE', createdBy: ids.admin },
    ] })
    await db.course.create({ data: { id: ids.course, title: 'Course', slug: `${key}-course`, status: 'PUBLISHED', createdBy: ids.admin } })
    await db.chapter.create({ data: { id: ids.chapter, courseId: ids.course, title: 'Chapter' } })
    await db.topic.create({ data: { id: ids.topic, chapterId: ids.chapter, title: 'Topic' } })
    await db.video.create({ data: { id: ids.video, topicId: ids.topic, title: 'Video', youtubeId: 'dQw4w9WgXcQ', duration: 100, status: 'PUBLISHED', publishedAt: new Date(), createdBy: ids.admin } })
  })

  afterAll(async () => {
    await db.test.deleteMany({ where: { id: { startsWith: key } } })
    await db.course.deleteMany({ where: { id: { startsWith: key } } })
    await db.batch.deleteMany({ where: { id: { startsWith: key } } })
    await db.auditLog.deleteMany({ where: { actorId: ids.admin } })
    await db.user.deleteMany({ where: { id: { startsWith: key } } })
  }, 60_000)

  it('executes the admin setup and publication flow through domain owners', async () => {
    await EnrollmentService.assignStudentToBatch(ids.batch, ids.student, ctx)
    await EnrollmentService.assignStudentToBatch(ids.otherBatch, ids.outsider, ctx)
    await BatchCourseService.assignCoursesToBatch(ids.batch, [ids.course], ctx)
    const invalidTestId = `${key}-invalid-test`
    await db.test.create({ data: { id: invalidTestId, title: 'Invalid empty test', durationMins: 30, maxAttempts: 1, maxQuestions: 10, status: 'DRAFT', createdBy: ids.admin } })
    await expect(TestPublicationService.publishTest(invalidTestId, ctx)).rejects.toThrow('at least one question')
    const material = await MaterialService.createMaterial({ batchId: ids.batch, courseId: ids.course, chapterId: ids.chapter, topicId: ids.topic, title: 'Shared notes', platform: 'OTHER', externalUrl: 'https://example.com/notes.pdf', materialType: 'PDF', published: true }, ctx)
    materialId = material.id
    await db.test.create({ data: { id: ids.test, title: 'Published test', durationMins: 30, maxAttempts: 2, maxQuestions: 10, status: 'DRAFT', createdBy: ids.admin, batches: { create: { batchId: ids.batch } }, questions: { create: { id: ids.question, text: 'Choose A', marks: 2, options: { create: [{ id: ids.correct, text: 'A', isCorrect: true }, { id: ids.wrong, text: 'B', isCorrect: false }] } } } } })
    const published = await TestPublicationService.publishTest(ids.test, ctx)
    expect(published.status).toBe('PUBLISHED')
    expect((await StudentContentAccessPolicy.canAccessCourse(ids.student, ids.course)).allowed).toBe(true)
    expect((await StudentContentAccessPolicy.canAccessMaterial(ids.student, material.id)).allowed).toBe(true)
    expect((await StudentContentAccessPolicy.canAccessMaterial(ids.outsider, material.id)).allowed).toBe(false)
    expect((await StudentContentAccessPolicy.canAccessVideo(ids.student, ids.video)).allowed).toBe(true)
  }, 60_000)

  it('saves, resumes and submits identical server-persisted answers manually and by timeout', async () => {
    const manual = await TestAttemptService.startAttempt(ids.test, ids.student)
    await TestAttemptService.saveAnswers(manual.attempt.id, ids.student, [{ questionId: ids.question, selectedOptionId: ids.correct, revision: 1 }])
    const resumed = await TestAttemptService.startAttempt(ids.test, ids.student)
    expect(resumed.attempt.id).toBe(manual.attempt.id)
    await TestAttemptService.submitAttempt(manual.attempt.id, ids.student, [], 'MANUAL')
    const manualResult = await db.testAttempt.findUniqueOrThrow({ where: { id: manual.attempt.id } })
    expect(manualResult.score).toBe(2)

    const timeout = await TestAttemptService.startAttempt(ids.test, ids.student)
    await TestAttemptService.saveAnswers(timeout.attempt.id, ids.student, [{ questionId: ids.question, selectedOptionId: ids.correct, revision: 1 }])
    await db.testAttempt.update({ where: { id: timeout.attempt.id }, data: { expiresAt: new Date(Date.now() - 1000) } })
    await TestAttemptService.submitAttempt(timeout.attempt.id, ids.student, [], 'AUTO_TIMEOUT')
    const timeoutResult = await db.testAttempt.findUniqueOrThrow({ where: { id: timeout.attempt.id } })
    expect(timeoutResult.score).toBe(manualResult.score)
    expect(timeoutResult.submissionType).toBe('AUTO_TIMEOUT')
  }, 60_000)

  it('archives nested content without deleting progress or academic history', async () => {
    await db.videoProgress.create({ data: { userId: ids.student, videoId: ids.video, position: 20, percent: 20, watchedSeconds: 20 } })
    await ContentLifecycleService.archiveVideo(ids.video, ctx)
    expect(await db.videoProgress.count({ where: { videoId: ids.video } })).toBe(1)
    expect((await StudentContentAccessPolicy.canAccessVideo(ids.student, ids.video)).allowed).toBe(false)
    await ContentLifecycleService.archiveTopic(ids.topic, ctx)
    await ContentLifecycleService.archiveChapter(ids.chapter, ctx)
    expect(await db.material.count({ where: { id: materialId } })).toBe(1)
    expect((await StudentContentAccessPolicy.canAccessMaterial(ids.student, materialId)).allowed).toBe(false)
    expect(await db.testAttempt.count({ where: { testId: ids.test } })).toBe(2)
  })
})
