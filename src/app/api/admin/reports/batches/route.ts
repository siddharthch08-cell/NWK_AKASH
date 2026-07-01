import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { unauthorized } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import ExcelJS from 'exceljs'

function safe(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s = String(v)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return s
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const batches = await db.batch.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { enrollments: true, courses: true, tests: true } },
      creator: { select: { name: true } },
    },
    take: 10000,
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Naya Wallah Kanoon'
  wb.created = new Date()
  const ws = wb.addWorksheet('Batches')
  ws.addRow(['Naya Wallah Kanoon — Batches Export'])
  ws.addRow([`Generated: ${new Date().toISOString()}`])
  ws.addRow([])
  ws.columns = [
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
  ]
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i]
    ws.addRow({
      sno: i + 1,
      name: safe(b.name),
      slug: safe(b.slug),
      status: safe(b.status),
      start: b.startDate ? b.startDate.toISOString() : '',
      end: b.endDate ? b.endDate.toISOString() : '',
      capacity: b.capacity ?? '',
      enrolled: b._count.enrollments,
      courses: b._count.courses,
      tests: b._count.tests,
      createdBy: safe(b.creator.name),
    })
  }
  const headerRow = ws.getRow(4)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }

  await audit({ ctx, action: 'REPORT_EXPORTED', entityType: 'REPORT', entityId: 'batches', after: { rows: batches.length } })

  const buf = await wb.xlsx.writeBuffer()
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="batches-${Date.now()}.xlsx"`,
    },
  })
}
