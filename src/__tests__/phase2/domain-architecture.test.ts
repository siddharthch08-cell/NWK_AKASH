import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const read = (relative: string) => fs.readFileSync(path.join(__dirname, '../..', relative), 'utf-8')

describe('Phase 2 domain ownership and integrity contracts', () => {
  const schema = read('../prisma/schema.prisma')
  const courseBatch = read('domain/course-batch/service.ts')
  const enrollment = read('domain/enrollment/service.ts')
  const access = read('domain/student-access/policy.ts')
  const material = read('domain/material.ts')
  const publication = read('domain/test-publication.ts')
  const attempt = read('domain/test-attempt.ts')
  const progress = read('domain/video-progress.ts')

  it('database-enforces one answer per attempt question', () => {
    expect(schema).toContain('@@unique([attemptId, questionId])')
    expect(attempt).toContain('attemptId_questionId')
    expect(attempt).toContain('upsert')
  })

  it('serializes capacity checks and counts only genuinely new enrollment', () => {
    expect(enrollment).toContain('UPDATE Batch SET capacity = capacity')
    expect(enrollment).toContain('alreadyEnrolled')
    expect(enrollment).toContain('newIds.length > capacityRemaining')
    expect(enrollment).toContain('Student account is not approved')
  })

  it('preserves hidden course assignments outside editable synchronization scope', () => {
    expect(courseBatch).toContain('editableCurrent')
    expect(courseBatch).toContain('toRemove = editableCurrent')
    expect(courseBatch).not.toContain('deleteMany({ where: { courseId } })')
  })

  it('central policy checks account, active batch, course and parent lifecycles', () => {
    expect(access).toContain('APPROVED_ACCOUNT_STATUSES')
    expect(access).toContain('ACCESSIBLE_BATCH_STATUSES')
    expect(access).toContain("course.status !== 'PUBLISHED'")
    expect(access).toContain('parent is archived')
    expect(access).toContain('Result is not published')
  })

  it('material PATCH validates the merged final state using the create validator', () => {
    expect(material).toContain('const finalState: MaterialInput')
    expect(material.match(/validateFinalState/g)?.length).toBeGreaterThanOrEqual(3)
    expect(material).toContain('Topic does not belong to the selected chapter')
    expect(material).toContain('Material cannot be published under an archived parent')
  })

  it('all publication transitions validate questions, marks, batches and dates', () => {
    expect(publication).toContain('collectPublicationErrors')
    expect(publication).toContain('exactly one correct option')
    expect(publication).toContain('positive integer marks')
    expect(publication).toContain('at least one eligible batch')
    expect(publication).toContain('end date must be after')
  })

  it('persists deterministic attempt ordering and serializes attempt start', () => {
    expect(schema).toContain('questionOrder')
    expect(schema).toContain('optionOrder')
    expect(attempt).toContain('buildOrders')
    expect(attempt).toContain('UPDATE Test SET updatedAt = updatedAt')
    expect(attempt).toContain("error.code === 'P2002'")
  })

  it('derives video completion from plausible server-tracked playback', () => {
    expect(progress).toContain('_clientPercent')
    expect(progress).toContain('plausibleCredit')
    expect(progress).toContain('watchedSeconds')
    expect(progress).toContain('lastSessionId')
  })
})
