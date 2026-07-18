import { describe, expect, it, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { NextRequest } from 'next/server'
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
    expect(ui).toContain('inFlightAutosaveRef.current')
    expect(ui).toContain('await inFlightAutosaveRef.current')
    expect(ui).toContain('const answerSnapshot = { ...answersRef.current }')
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
    const engine = source('lib/test-engine.ts')
    expect(engine).toContain('UPDATE "TestAttempt" SET "score" = "score" WHERE "id" =')
    expect(engine).not.toContain('UPDATE TestAttempt SET score')
  })

  it('returns a sanitized JSON envelope with a request ID for unexpected submission failures', async () => {
    vi.resetModules()
    const submitAttempt = vi.fn().mockRejectedValue(new Error('injected failure'))
    vi.doMock('@/lib/auth', () => ({
      requireActiveStudent: vi.fn().mockResolvedValue({ user: { id: 'student-1' }, requestId: 'request-test-1' }),
    }))
    vi.doMock('@/lib/rate-limit', () => ({
      enforceRateLimit: vi.fn().mockResolvedValue({ ok: true }),
    }))
    vi.doMock('@/domain', () => ({
      DomainError: class DomainError extends Error {},
      ResultService: { getStudentResult: vi.fn() },
      TestAttemptService: { getAttempt: vi.fn(), saveAnswers: vi.fn(), submitAttempt },
    }))
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      const { POST } = await import('@/app/api/student/attempts/[id]/route')
      const request = new NextRequest('http://localhost/api/student/attempts/attempt-1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers: [], submissionType: 'MANUAL', finalize: true }),
      })
      const response = await POST(request, { params: Promise.resolve({ id: 'attempt-1' }) })
      const envelope = await response.json()

      expect(response.status).toBe(500)
      expect(response.headers.get('content-type')).toContain('application/json')
      expect(response.headers.get('x-request-id')).toBe('request-test-1')
      expect(envelope).toMatchObject({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Unable to submit the test. Please try again.' },
        requestId: 'request-test-1',
      })
      expect(JSON.stringify(envelope)).not.toContain('injected failure')
      expect(errorLog).toHaveBeenCalledWith('[student-attempt] unexpected failure', expect.objectContaining({
        route: '/api/student/attempts/[id]',
        operation: 'submit',
        requestId: 'request-test-1',
        errorClass: 'Error',
      }))
    } finally {
      errorLog.mockRestore()
      vi.doUnmock('@/lib/auth')
      vi.doUnmock('@/lib/rate-limit')
      vi.doUnmock('@/domain')
      vi.resetModules()
    }
  })

  it('retains all compatibility assignment routes as service wrappers', () => {
    expect(source('app/api/admin/batches/[id]/assign-courses/route.ts')).toContain('BatchCourseService.assignCoursesToBatch')
    expect(source('app/api/admin/courses/[id]/assign-batches/route.ts')).toContain('BatchCourseService.assignBatchesToCourse')
    expect(source('app/api/admin/courses/[id]/batches/route.ts')).toContain('BatchCourseService.syncCourseBatches')
    expect(source('app/api/admin/students/[id]/batches/route.ts')).toContain('EnrollmentService.assignStudentToBatch')
  })
  it('keeps student progress query counts independent of enrolled course count', () => {
    const dashboard = source('app/api/student/dashboard/route.ts')
    const courses = source('app/api/student/courses/route.ts')
    expect(dashboard).not.toContain('e.batch.courses.map(async')
    expect(dashboard).toContain("courseId: { in: courseIds }")
    expect(dashboard).toContain("_count: { select: { progress: { where: { userId, completed: true } } } }")
    expect(courses).not.toContain('courses.map(async')
    expect(courses).toContain("courseId: { in: courseIds }")
  })

  it('uses bounded admin summary and analytics loaders', () => {
    const summary = source('app/api/admin/dashboard/route.ts')
    const analytics = source('app/api/admin/analytics/route.ts')
    expect(summary).toContain("db.user.groupBy")
    expect(summary).toContain("db.$queryRaw<DashboardMetrics[]>")
    expect(summary).not.toContain("db.user.count")
    expect(analytics).toContain("db.$queryRaw<TopVideo[]>")
    expect(analytics).not.toContain("progress: { select:")
  })

  it('caps answer batches and bulk-loads stored revisions before writing', () => {
    const validation = source('lib/validation.ts')
    const attempts = source('domain/test-attempt.ts')
    expect(validation).toContain(".max(20, 'A maximum of 20 answers can be submitted at once')")
    expect(attempts).toContain('const existingAnswers = questionIds.length === 0')
    expect(attempts).toContain('questionId: { in: questionIds }')
    expect(attempts).not.toContain('attemptId_questionId: { attemptId, questionId: answer.questionId } }, select: { revision: true }')
  })

  it('keeps dashboard cache data session-scoped and mutation-invalidated', () => {
    const client = source('lib/api-client.ts')
    expect(client).toContain('let cacheGeneration = 0')
    expect(client).toContain('cacheGeneration += 1')
    expect(client).toContain('generation === cacheGeneration')
    expect(client).toContain('async function mutationRequest')
    expect(client).toContain('clearApiCache()')
  })

  it('makes public settings reads side-effect free with explicit cache boundaries', () => {
    const settings = source('lib/settings.ts')
    const responses = source('lib/api-response.ts')
    expect(settings).toContain('instituteSetting.findUnique')
    expect(settings).not.toContain('instituteSetting.upsert')
    expect(responses).toContain("'Cache-Control': 'private, no-store'")
    expect(responses).toContain('s-maxage=60, stale-while-revalidate=300')
  })
})
