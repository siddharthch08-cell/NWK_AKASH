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

  const url = new URL(req.url)
  const testId = url.searchParams.get('testId') || ''
  const batchId = url.searchParams.get('batchId') || ''

  const where: any = { status: 'SUBMITTED' }
  if (testId) where.testId = testId
  if (batchId) where.test = { batches: { some: { batchId } } }

  const attempts = await db.testAttempt.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
      test: { select: { title: true } },
    },
    take: 10000,
  })

  const filters = `testId=${testId || '-'}, batchId=${batchId || '-'}`
  const wb = new ExcelJS.Workbook()
  wb.creator = 'EDULEARN PRO'
  wb.created = new Date()
  const ws = wb.addWorksheet('Test Attempts')
  ws.addRow(['EDULEARN PRO — Test Attempts Export'])
  ws.addRow([`Generated: ${new Date().toISOString()}`])
  ws.addRow([`Filters: ${filters}`])
  ws.addRow([])

  ws.columns = [
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
  ]
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i]
    ws.addRow({
      sno: i + 1,
      student: safe(a.user.name),
      email: safe(a.user.email),
      test: safe(a.test.title),
      attempt: a.attemptNumber,
      score: a.score,
      total: a.totalMarks,
      pct: a.percentage,
      time: a.timeTakenSecs,
      submissionType: safe(a.submissionType),
      submittedAt: a.submittedAt ? a.submittedAt.toISOString() : '',
    })
  }

  const headerRow = ws.getRow(5)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }

  ws.columns.forEach((c) => {
    let max = (c.header as string)?.length || 10
    for (let i = 0; i < attempts.length; i++) {
      const row = ws.getRow(i + 6)
      const v = String(row.getCell(c.key as string).value || '')
      if (v.length > max) max = v.length
    }
    c.width = Math.min(60, max + 2)
  })

  await audit({ ctx, action: 'REPORT_EXPORTED', entityType: 'REPORT', entityId: 'attempts', after: { rows: attempts.length, filters } })

  const buf = await wb.xlsx.writeBuffer()
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="test-attempts-${Date.now()}.xlsx"`,
    },
  })
}
