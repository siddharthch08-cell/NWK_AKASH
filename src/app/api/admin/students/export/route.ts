import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { parsePagination, tooMany, unauthorized } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { createCsv, downloadResponse } from '@/lib/export-security'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const limit = await enforceRateLimit(req, 'export', ctx.user.id)
  if (!limit.ok) return tooMany('Too many export requests.', limit.retryAfterMs, ctx.requestId)
  const p = parsePagination(req)
  const where: Prisma.UserWhereInput = { role: 'STUDENT', deletedAt: null }
  if (p.search) where.OR = [{ name: { contains: p.search } }, { email: { contains: p.search } }, { phone: { contains: p.search } }]
  if (p.status) where.status = String(p.status)
  if (p.batchId) where.enrollments = { some: { batchId: String(p.batchId) } }
  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { name: true, email: true, phone: true, status: true, createdAt: true, lastLoginAt: true, enrollments: { include: { batch: { select: { name: true } } } } },
  })
  const rows = users.map(user => [user.name, user.email, user.phone || '', user.status, user.createdAt.toISOString(), user.lastLoginAt?.toISOString() || '', user.enrollments.map(item => item.batch.name).join('; ')])
  const generatedAt = new Date().toISOString()
  const csv = createCsv([
    ['Naya Wallah Kanoon Students Export'], ['Generated', generatedAt],
    ['Search filter', p.search || '-'], ['Status filter', p.status || '-'], ['Batch filter', p.batchId || '-'], [],
    ['Name', 'Email', 'Phone', 'Status', 'CreatedAt', 'LastLogin', 'Batches'], ...rows,
  ])
  await audit({ ctx, action: 'REPORT_EXPORTED', entityType: 'STUDENT_EXPORT', after: { outcome: 'SUCCESS', format: 'csv', rows: rows.length } })
  return downloadResponse(csv, `students-${Date.now()}.csv`, 'text/csv; charset=utf-8')
}
