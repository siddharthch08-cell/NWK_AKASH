import { NextRequest } from 'next/server'
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

  const batches = await db.batch.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { enrollments: true, courses: true, tests: true } },
      creator: { select: { name: true } },
    },
    take: 10000,
  })
  const rows = batches.map((batch, index) => ({
    sno: index + 1,
    name: batch.name,
    slug: batch.slug,
    status: batch.status,
    start: batch.startDate?.toISOString() || '',
    end: batch.endDate?.toISOString() || '',
    capacity: batch.capacity ?? '',
    enrolled: batch._count.enrollments,
    courses: batch._count.courses,
    tests: batch._count.tests,
    createdBy: batch.creator.name,
  }))
  await audit({ ctx, action: 'REPORT_EXPORTED', entityType: 'REPORT', entityId: 'batches', after: { format: 'xlsx', rows: rows.length } })
  return createXlsxDownload({
    filename: `batches-${Date.now()}.xlsx`,
    sheetName: 'Batches',
    title: 'Naya Wallah Kanoon — Batches Export',
    columns: [
      { header: '#', key: 'sno', width: 6 },
      { header: 'Name', key: 'name' },
      { header: 'Slug', key: 'slug' },
      { header: 'Status', key: 'status' },
      { header: 'Start Date', key: 'start' },
      { header: 'End Date', key: 'end' },
      { header: 'Capacity', key: 'capacity' },
      { header: 'Enrolled', key: 'enrolled' },
      { header: 'Courses', key: 'courses' },
      { header: 'Tests', key: 'tests' },
      { header: 'Created By', key: 'createdBy' },
    ],
    rows,
  })
}
