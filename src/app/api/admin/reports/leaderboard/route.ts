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

  const attempts = await db.testAttempt.findMany({
    where: { status: 'SUBMITTED' },
    include: { user: { select: { name: true, email: true } }, test: { select: { id: true, title: true } } },
    take: 10000,
  })

  // Aggregate per student per test (best pct)
  const bestPerTest = new Map<string, Map<string, { pct: number; user: any; time: number; attempts: number }>>()
  for (const a of attempts) {
    const userMap = bestPerTest.get(a.userId) || new Map()
    const prev = userMap.get(a.testId)
    if (!prev || a.percentage > prev.pct) {
      userMap.set(a.testId, { pct: a.percentage, user: a.user, time: a.timeTakenSecs, attempts: (prev?.attempts || 0) + 1 })
    } else {
      prev.attempts++
    }
    bestPerTest.set(a.userId, userMap)
  }

  const rows: any[] = []
  bestPerTest.forEach((testMap, userId) => {
    const pcts = Array.from(testMap.values()).map((v) => v.pct)
    const first = Array.from(testMap.values())[0]
    rows.push({
      name: safe(first.user.name),
      email: safe(first.user.email),
      testsTaken: testMap.size,
      avgScore: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
      bestScore: pcts.length ? Math.max(...pcts) : 0,
      totalAttempts: Array.from(testMap.values()).reduce((a, v) => a + v.attempts, 0),
    })
  })
  rows.sort((a, b) => b.avgScore - a.avgScore || b.bestScore - a.bestScore)
  rows.forEach((r, i) => (r.rank = i + 1))

  const wb = new ExcelJS.Workbook()
  wb.creator = 'EDULEARN PRO'
  wb.created = new Date()
  const ws = wb.addWorksheet('Leaderboard')
  ws.addRow(['EDULEARN PRO — Leaderboard Export'])
  ws.addRow([`Generated: ${new Date().toISOString()}`])
  ws.addRow([])
  ws.columns = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Tests Taken', key: 'testsTaken' },
    { header: 'Avg Score %', key: 'avgScore' },
    { header: 'Best Score %', key: 'bestScore' },
    { header: 'Total Attempts', key: 'totalAttempts' },
  ]
  for (const r of rows) ws.addRow(r)
  const headerRow = ws.getRow(4)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }

  await audit({ ctx, action: 'REPORT_EXPORTED', entityType: 'REPORT', entityId: 'leaderboard', after: { rows: rows.length } })

  const buf = await wb.xlsx.writeBuffer()
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="leaderboard-${Date.now()}.xlsx"`,
    },
  })
}
