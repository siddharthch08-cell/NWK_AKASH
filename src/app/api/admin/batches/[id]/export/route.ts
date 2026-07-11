import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { unauthorized, notFound, tooMany } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { createCsv, downloadResponse } from '@/lib/export-security'
import { enforceRateLimit } from '@/lib/rate-limit'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const limit = await enforceRateLimit(req, 'export', ctx.user.id)
  if (!limit.ok) return tooMany('Too many export requests.', limit.retryAfterMs, ctx.requestId)
  const { id } = await params
  const batch = await db.batch.findUnique({
    where: { id },
    include: { enrollments: { include: { user: { select: { name: true, email: true, phone: true, status: true, lastLoginAt: true } } }, orderBy: { enrolledAt: 'desc' } } },
  })
  if (!batch) return notFound('Batch not found')
  const rows = batch.enrollments.map(item => [item.user.name, item.user.email, item.user.phone || '', item.user.status, item.enrolledAt.toISOString(), item.user.lastLoginAt?.toISOString() || ''])
  const csv = createCsv([
    ['Naya Wallah Kanoon Batch Enrollment Export'], ['Batch', batch.name], ['Generated', new Date().toISOString()], [],
    ['Name', 'Email', 'Phone', 'Status', 'EnrolledAt', 'LastLogin'], ...rows,
  ])
  await audit({ ctx, action: 'REPORT_EXPORTED', entityType: 'BATCH_ENROLLMENT_EXPORT', entityId: id, after: { outcome: 'SUCCESS', format: 'csv', rows: rows.length } })
  return downloadResponse(csv, `batch-${batch.slug}-enrollment.csv`, 'text/csv; charset=utf-8')
}
