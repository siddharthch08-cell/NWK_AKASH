'use client'

import { PageHeader } from '../../shared/admin-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Users, GraduationCap, Trophy, Download } from 'lucide-react'
import { toast } from 'sonner'

async function downloadReport(url: string, filename: string) {
  const token = window.localStorage.getItem('edulearn_access_token')
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) { toast.error('Export failed'); return }
  const blob = await res.blob()
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
}

const reports = [
  { key: 'students', title: 'Student List', desc: 'All students with status, batches, and login activity', icon: Users, url: '/api/admin/reports/students', filename: 'students.xlsx' },
  { key: 'batches', title: 'Batch Enrollment', desc: 'Batches with enrollment counts and courses', icon: GraduationCap, url: '/api/admin/reports/batches', filename: 'batches.xlsx' },
  { key: 'attempts', title: 'Test Attempts', desc: 'All submitted test attempts with scores', icon: FileText, url: '/api/admin/reports/attempts', filename: 'test-attempts.xlsx' },
  { key: 'leaderboard', title: 'Leaderboard', desc: 'Aggregated student leaderboard', icon: Trophy, url: '/api/admin/reports/leaderboard', filename: 'leaderboard.xlsx' },
]

export function AdminReports() {
  return (
    <div>
      <PageHeader title="Reports & Exports" subtitle="Export Excel reports with applied filters. Exports are escaped against formula injection." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Card key={r.key}>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><r.icon className="w-5 h-5 text-blue-600" /> {r.title}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">{r.desc}</p>
              <Button size="sm" onClick={() => downloadReport(r.url, r.filename)}><Download className="w-4 h-4 mr-1" /> Download Excel</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6"><CardHeader><CardTitle className="text-base">CSV Exports</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" onClick={() => downloadReport('/api/admin/students/export', 'students.csv')}><Download className="w-4 h-4 mr-1" /> Students CSV</Button>
        </CardContent>
      </Card>
    </div>
  )
}
