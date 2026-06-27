import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, parsePagination } from '@/lib/api-response'
import { Prisma } from '@prisma/client'

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const p = parsePagination(req)
  // Export ignores pagination, returns all matching
  const where: Prisma.UserWhereInput = { role: 'STUDENT', deletedAt: null }
  if (p.search) {
    where.OR = [
      { name: { contains: p.search } },
      { email: { contains: p.search } },
      { phone: { contains: p.search } },
    ]
  }
  if (p.status) where.status = String(p.status)
  if (p.batchId) where.enrollments = { some: { batchId: String(p.batchId) } }

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
  })

  const header = ['Name', 'Email', 'Phone', 'Status', 'CreatedAt', 'LastLogin', 'Batches']
  const rows = users.map((u) => [
    u.name,
    u.email,
    u.phone || '',
    u.status,
    u.createdAt.toISOString(),
    u.lastLoginAt ? u.lastLoginAt.toISOString() : '',
    u.enrollments.map((e) => e.batch.name).join('; '),
  ])
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n')

  const generatedAt = new Date().toISOString()
  const meta = `# EDULEARN PRO — Students Export\r\n# Generated: ${generatedAt}\r\n# Filter: search=${p.search || '-'} status=${p.status || '-'} batchId=${p.batchId || '-'}\r\n`

  return new Response(meta + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="students-${generatedAt}.csv"`,
    },
  })
}
