import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { assertDateRange, parseApiDate } from '@/domain/shared/date'

const source = (relative: string) => fs.readFileSync(path.join(__dirname, '../..', relative), 'utf-8')

describe('Phase 2 workflow regressions', () => {
  it('uses stable UTC semantics for offset-less API dates and validates merged ranges', () => {
    expect(parseApiDate('2026-07-03T12:30:00', 'startAt')?.toISOString()).toBe('2026-07-03T12:30:00.000Z')
    expect(() => parseApiDate('not-a-date', 'startAt')).toThrow('Invalid startAt')
    expect(() => assertDateRange(new Date('2026-07-04'), new Date('2026-07-03'))).toThrow('endAt must be after startAt')
  })

  it('does not retain the invalid empty-array unassign fallback', () => {
    const ui = source('components/edulearn/admin/pages/batch-detail.tsx')
    expect(ui).toContain('api.del(`/api/admin/batches/${id}/assign-courses?courseId=${courseId}`)')
    expect(ui).not.toContain("assign-courses`, { courseIds: [] }")
  })

  it('submits current answers through a ref, debounced autosave and a submit lock', () => {
    const ui = source('components/edulearn/student/pages/take-test.tsx')
    expect(ui).toContain('answersRef.current')
    expect(ui).toContain('autosaveRef.current')
    expect(ui).toContain('submittingRef.current')
    expect(ui).toContain("submit('AUTO_TIMEOUT')")
    expect(ui).toContain('Save failed - retry required')
  })

  it('returns true enrollment pagination and a clearly named derived material count', () => {
    const route = source('app/api/admin/batches/[id]/route.ts')
    const ui = source('components/edulearn/admin/pages/batch-detail.tsx')
    expect(route).toContain('EnrollmentService.getBatchEnrollments')
    expect(route).toContain('publishedCourseMaterials')
    expect(ui).toContain('enrollmentPagination.totalPages')
    expect(ui).toContain('Published course materials')
  })

  it('quotes mixed-case Prisma identifiers in PostgreSQL transaction locks', () => {
    const enrollment = source('domain/enrollment/service.ts')
    expect(enrollment).toContain('UPDATE "Batch" SET "capacity" = "capacity" WHERE "id" =')
    expect(enrollment).not.toContain('UPDATE Batch SET capacity')
    expect(source('domain/video-progress.ts')).toContain('UPDATE "Video" SET "updatedAt" = "updatedAt" WHERE "id" =')
    expect(source('domain/test-attempt.ts')).toContain('UPDATE "TestAttempt" SET "score" = "score" WHERE "id" =')
  })
  it('retains all compatibility assignment routes as service wrappers', () => {
    expect(source('app/api/admin/batches/[id]/assign-courses/route.ts')).toContain('BatchCourseService.assignCoursesToBatch')
    expect(source('app/api/admin/courses/[id]/assign-batches/route.ts')).toContain('BatchCourseService.assignBatchesToCourse')
    expect(source('app/api/admin/courses/[id]/batches/route.ts')).toContain('BatchCourseService.syncCourseBatches')
    expect(source('app/api/admin/students/[id]/batches/route.ts')).toContain('EnrollmentService.assignStudentToBatch')
  })
})
