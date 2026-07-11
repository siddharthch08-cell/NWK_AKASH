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
  const status = url.searchParams.get('status') || ''
  const search = url.searchParams.get('search') || ''
  const where: Prisma.UserWhereInput = { role: 'STUDENT', deletedAt: null }
  if (status) where.status = status
  if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }]

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      name: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      enrollments: { include: { batch: { select: { name: true } } } },
    },
    take: 10000,
  })
  const filters = `status=${status || '-'}, search=${search || '-'}`
  const rows = users.map((user, index) => ({
    sno: index + 1,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    status: user.status,
    batches: user.enrollments.map(item => item.batch.name).join('; '),
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() || '',
  }))
  await audit({ ctx, action: 'REPORT_EXPORTED', entityType: 'REPORT', entityId: 'students', after: { format: 'xlsx', rows: rows.length, filters } })
  return createXlsxDownload({
    filename: `students-${Date.now()}.xlsx`,
    sheetName: 'Students',
    title: 'Naya Wallah Kanoon — Students Export',
    filters,
    columns: [
      { header: '#', key: 'sno', width: 6 },
      { header: 'Name', key: 'name' },
      { header: 'Email', key: 'email' },
      { header: 'Phone', key: 'phone' },
      { header: 'Status', key: 'status' },
      { header: 'Batches', key: 'batches' },
      { header: 'Created At', key: 'createdAt' },
      { header: 'Last Login', key: 'lastLoginAt' },
    ],
    rows,
  })
}
