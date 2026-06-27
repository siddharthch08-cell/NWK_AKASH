import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { unauthorized, notFound } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const batch = await db.batch.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          user: { select: { name: true, email: true, phone: true, status: true, lastLoginAt: true } },
        },
        orderBy: { enrolledAt: 'desc' },
      },
    },
  })
  if (!batch) return notFound('Batch not found')

  const header = ['Name', 'Email', 'Phone', 'Status', 'EnrolledAt', 'LastLogin']
  const rows = batch.enrollments.map((e) => [
    e.user.name,
    e.user.email,
    e.user.phone || '',
    e.user.status,
    e.enrolledAt.toISOString(),
    e.user.lastLoginAt ? e.user.lastLoginAt.toISOString() : '',
  ])
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n')
  const meta = `# EDULEARN PRO — Batch Enrollment Export\r\n# Batch: ${batch.name}\r\n# Generated: ${new Date().toISOString()}\r\n`

  return new Response(meta + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="batch-${batch.slug}-enrollment.csv"`,
    },
  })
}
