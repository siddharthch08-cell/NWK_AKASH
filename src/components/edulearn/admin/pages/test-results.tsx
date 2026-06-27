'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/stores/app-store'
import { api, ApiError } from '@/lib/api-client'
import { useApi, useToastAction, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Download, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { toast } from 'sonner'

export function AdminTestResults() {
  const toastAction = useToastAction()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ leaderboard: any[] }>('/api/admin/leaderboard')
      .then((d) => setData(d.leaderboard))
      .catch((e) => toastAction.error(e))
      .finally(() => setLoading(false))
  }, [])

  const exportXlsx = async () => {
    const token = window.localStorage.getItem('edulearn_access_token')
    const res = await fetch('/api/admin/reports/attempts', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) return toast.error('Export failed')
    const blob = await res.blob()
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'test-attempts.xlsx'; a.click()
  }

  return (
    <div>
      <PageHeader title="Test Results & Analytics" subtitle="View aggregated student performance and export reports"
        actions={<Button size="sm" variant="outline" onClick={exportXlsx}><Download className="w-4 h-4 mr-1" /> Export Excel</Button>} />
      <Card><CardContent className="p-0">
        {loading ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div> : data.length === 0 ? <EmptyState icon={FileText} title="No results yet" message="Student test attempts will appear here once submitted." /> : (
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow>
              <TableHead>Rank</TableHead><TableHead>Student</TableHead><TableHead className="hidden md:table-cell">Tests Taken</TableHead><TableHead className="hidden md:table-cell">Attempts</TableHead><TableHead>Avg Score</TableHead><TableHead>Best Score</TableHead><TableHead className="hidden lg:table-cell">Total Time</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell><Badge variant={row.rank <= 3 ? 'default' : 'outline'} className={row.rank === 1 ? 'bg-amber-500' : row.rank === 2 ? 'bg-slate-400' : row.rank === 3 ? 'bg-amber-700' : ''}>{row.rank}</Badge></TableCell>
                  <TableCell><div className="font-medium">{row.name}</div></TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{row.testsTaken}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{row.totalAttempts}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{row.avgScore}%</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">{row.bestScore}%</Badge></TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-slate-500">{Math.round(row.totalTime / 60)}m</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        )}
      </CardContent></Card>
    </div>
  )
}

export function AdminAnalytics() {
  const { data, loading } = useApi<any>('/api/admin/dashboard')
  if (loading || !data) return <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>

  const statusPie = [
    { name: 'Active', value: data.cards.activeStudents, color: '#10b981' },
    { name: 'Approved', value: data.cards.approvedStudents, color: '#3b82f6' },
    { name: 'Pending', value: data.cards.pendingStudents, color: '#f59e0b' },
    { name: 'Inactive', value: data.cards.inactiveStudents, color: '#64748b' },
    { name: 'Blocked', value: data.cards.blockedStudents, color: '#ef4444' },
  ].filter((s) => s.value > 0)

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Deep-dive into engagement, performance, and trends" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base">Student Growth (8 weeks)</CardTitle></CardHeader>
          <CardContent><ResponsiveContainer width="100%" height={280}><BarChart data={data.studentGrowth}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="registered" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-base">Student Status Distribution</CardTitle></CardHeader>
          <CardContent><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={statusPie} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={(e: any) => `${e.name}: ${e.value}`}>{statusPie.map((s, i) => <Cell key={i} fill={s.color} />)}</Pie><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer></CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-base">Batch Enrollment</CardTitle></CardHeader>
          <CardContent><ResponsiveContainer width="100%" height={280}><BarChart data={data.batchEnrollment} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="enrolled" fill="#14b8a6" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-base">Top Videos by Viewers</CardTitle></CardHeader>
          <CardContent><ResponsiveContainer width="100%" height={280}><BarChart data={data.topVideos}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="title" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={70} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="viewers" fill="#8b5cf6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent>
        </Card>
      </div>
    </div>
  )
}
