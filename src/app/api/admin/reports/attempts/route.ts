import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { tooMany, unauthorized } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { enforceRateLimit } from '@/lib/rate-limit'
import { createXlsxDownload } from '@/lib/xlsx-export'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const limit = await enforceRateLimit(req, 'export', ctx.user.id)
  if (!limit.ok) return tooMany('Too many export requests.', limit.retryAfterMs, ctx.requestId)

  const url = new URL(req.url)
  const testId = url.searchParams.get('testId') || ''
  const batchId = url.searchParams.get('batchId') || ''
  const where: Prisma.TestAttemptWhereInput = { status: 'SUBMITTED' }
  if (testId) where.testId = testId
  if (batchId) where.test = { batches: { some: { batchId } } }
  const attempts = await db.testAttempt.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
    include: { user: { select: { name: true, email: true } }, test: { select: { title: true } } },
    take: 10000,
  })
  const filters = `testId=${testId || '-'}, batchId=${batchId || '-'}`
  const rows = attempts.map((attempt, index) => ({
    sno: index + 1,
    student: attempt.user.name,
    email: attempt.user.email,
    test: attempt.test.title,
    attempt: attempt.attemptNumber,
    score: attempt.score,
    total: attempt.totalMarks,
    pct: attempt.percentage,
    time: attempt.timeTakenSecs,
    submissionType: attempt.submissionType || '',
    submittedAt: attempt.submittedAt?.toISOString() || '',
  }))
  await audit({ ctx, action: 'REPORT_EXPORTED', entityType: 'REPORT', entityId: 'attempts', after: { format: 'xlsx', rows: rows.length, filters } })
  return createXlsxDownload({
    filename: `test-attempts-${Date.now()}.xlsx`,
    sheetName: 'Test Attempts',
    title: 'Naya Wallah Kanoon — Test Attempts Export',
    filters,
    columns: [
      { header: '#', key: 'sno', width: 6 },
      { header: 'Student', key: 'student' },
      { header: 'Email', key: 'email' },
      { header: 'Test', key: 'test' },
      { header: 'Attempt #', key: 'attempt' },
      { header: 'Score', key: 'score' },
      { header: 'Total', key: 'total' },
      { header: 'Percentage', key: 'pct' },
      { header: 'Time (sec)', key: 'time' },
      { header: 'Submission', key: 'submissionType' },
      { header: 'Submitted At', key: 'submittedAt' },
    ],
    rows,
  })
}
