import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { unauthorized } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import ExcelJS from 'exceljs'

// Helper: prevent formula injection by prefixing cell text with a single quote
// if it begins with =, +, -, or @
function safe(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s = String(v)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return s
}

async function exportWorkbook(
  filename: string,
  sheetName: string,
  filtersLabel: string,
  columns: Partial<ExcelJS.Column>[],
  rows: Record<string, unknown>[]
) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'EDULEARN PRO'
  wb.created = new Date()
  const ws = wb.addWorksheet(sheetName)

  // Add a meta header row at the top
  ws.addRow(['EDULEARN PRO — Export'])
  ws.addRow([`Generated: ${new Date().toISOString()}`])
  ws.addRow([`Filters: ${filtersLabel}`])
  ws.addRow([])

  ws.columns = columns
  for (const r of rows) {
    const row: Record<string, string> = {}
    for (const c of columns) {
      const key = c.key as string
      row[key] = safe(r[key])
    }
    ws.addRow(row)
  }

  // Style header row (row 5 — after meta rows)
  const headerRow = ws.getRow(5)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' },
  }
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }

  // Auto width
  ws.columns.forEach((c) => {
    let max = (c.header as string)?.length || 10
    for (const r of rows) {
      const v = safe(r[c.key as string])
      if (v.length > max) max = v.length
    }
    c.width = Math.min(60, max + 2)
  })

  const buf = await wb.xlsx.writeBuffer()

  await audit({
    ctx: null,
    action: 'REPORT_EXPORTED',
    entityType: 'REPORT',
    entityId: filename,
    after: { format: 'xlsx', sheetName, rows: rows.length, filters: filtersLabel },
  })

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export { exportWorkbook }

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const url = new URL(req.url)
  const status = url.searchParams.get('status') || ''
  const search = url.searchParams.get('search') || ''

  const where: any = { role: 'STUDENT', deletedAt: null }
  if (status) where.status = status
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ]
  }

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
  const rows = users.map((u, i) => ({
    sno: i + 1,
    name: u.name,
    email: u.email,
    phone: u.phone || '',
    status: u.status,
    batches: u.enrollments.map((e) => e.batch.name).join('; '),
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : '',
  }))

  return exportWorkbook(
    `students-${Date.now()}.xlsx`,
    'Students',
    filters,
    [
      { header: '#', key: 'sno', width: 6 },
      { header: 'Name', key: 'name' },
      { header: 'Email', key: 'email' },
      { header: 'Phone', key: 'phone' },
      { header: 'Status', key: 'status' },
      { header: 'Batches', key: 'batches' },
      { header: 'Created At', key: 'createdAt' },
      { header: 'Last Login', key: 'lastLoginAt' },
    ],
    rows
  ).then((r) => {
    // Also record audit with ctx
    if (ctx) {
      audit({ ctx, action: 'REPORT_EXPORTED', entityType: 'REPORT', entityId: 'students', after: { rows: rows.length, filters } })
    }
    return r
  })
}
