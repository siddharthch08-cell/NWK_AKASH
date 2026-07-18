'use client'

import { useApp } from '@/stores/app-store'
import { useApi, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Eye, Award } from 'lucide-react'
import { fmtDateTime } from '@/lib/format'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ResultListItem {
  id: string
  attemptNumber: number
  submittedAt: string | null
  resultPublished: boolean
  percentage: number | null
  test: { id: string; title: string }
}

interface ResultsData {
  attempts: ResultListItem[]
  stats: { total: number; published: number; avgScore: number; bestScore: number }
}

export function StudentResults() {
  const { setView } = useApp()
  const { data, loading } = useApi<ResultsData>('/api/student/results')

  if (loading) return <div className="text-center py-12 text-slate-500">Loading…</div>
  if (!data) return null

  const publishedAttempts = data.attempts.filter((attempt): attempt is ResultListItem & { percentage: number } => attempt.resultPublished && attempt.percentage !== null)
  const chartData = [...publishedAttempts].reverse().map((a, i) => ({ attempt: `#${i + 1}`, percentage: a.percentage, title: a.test.title.slice(0, 20) }))

  return (
    <div>
      <PageHeader title="My Results" subtitle="Your test attempt history and performance" />
      {data.attempts.length === 0 ? <EmptyState icon={Trophy} title="No results yet" message="Your test results will appear here after you attempt a test." /> : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-700">{data.stats.total}</div><div className="text-xs text-slate-500">Attempts</div></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-teal-700">{data.stats.avgScore}%</div><div className="text-xs text-slate-500">Average</div></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-amber-700">{data.stats.bestScore}%</div><div className="text-xs text-slate-500">Best Score</div></CardContent></Card>
          </div>

          {chartData.length > 1 && (
            <Card className="mb-4"><CardContent className="pt-4">
              <h3 className="text-sm font-semibold mb-3">Progress Over Time</h3>
              <ResponsiveContainer width="100%" height={220}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="attempt" tick={{ fontSize: 12 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 12 }} /><Tooltip /><Line type="monotone" dataKey="percentage" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} /></LineChart></ResponsiveContainer>
            </CardContent></Card>
          )}

          <Card><CardContent className="p-0">
            <div className="divide-y">
              {data.attempts.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Award className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="min-w-0"><div className="font-medium text-sm truncate">{a.test.title}</div><div className="text-xs text-slate-500">Attempt #{a.attemptNumber} · {fmtDateTime(a.submittedAt)}</div></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.resultPublished && a.percentage !== null
                      ? <><Badge variant="outline" className={a.percentage >= 50 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}>{a.percentage}%</Badge><Button variant="ghost" size="sm" onClick={() => setView({ name: 'student/results/detail', id: a.id })} aria-label={`View ${a.test.title} result`}><Eye className="w-4 h-4" /></Button></>
                      : <Badge variant="outline" className="bg-blue-50 text-blue-700">Awaiting publication</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </>
      )}
    </div>
  )
}
