'use client'

import { useApp } from '@/stores/app-store'
import { useApi, PageHeader, StatCard } from '../../shared/admin-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, Clock, Ban, GraduationCap, BookOpen, Video, FileQuestion, Award, TrendingUp, Plus, UserPlus, Upload, Megaphone, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import { fmtDateTime, relativeTime, statusColor } from '@/lib/format'

interface DashboardData {
  cards: {
    totalStudents: number; pendingStudents: number; approvedStudents: number; activeStudents: number;
    inactiveStudents: number; blockedStudents: number; rejectedStudents: number;
    totalBatches: number; activeBatches: number; totalCourses: number; totalVideos: number;
    totalTests: number; testsAttempted: number; averageScore: number; totalWatchTimeSecs: number;
  }
  studentGrowth: { label: string; registered: number; approved: number }[]
  batchEnrollment: { name: string; enrolled: number; status: string }[]
  topVideos: { id: string; title: string; viewers: number; avgCompletion: number; completed: number }[]
  recentActivity: { id: string; action: string; entityType: string; entityId: string; actorRole: string; timestamp: string }[]
  recentRegistrations: { id: string; name: string; email: string; status: string; createdAt: string }[]
}

export function AdminDashboard() {
  const { setView } = useApp()
  const { data, loading } = useApi<DashboardData>('/api/admin/dashboard')

  if (loading || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Loading analytics…" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />)}
        </div>
      </div>
    )
  }

  const c = data.cards
  const statusPie = [
    { name: 'Active', value: c.activeStudents, color: '#10b981' },
    { name: 'Approved', value: c.approvedStudents, color: '#3b82f6' },
    { name: 'Pending', value: c.pendingStudents, color: '#f59e0b' },
    { name: 'Inactive', value: c.inactiveStudents, color: '#64748b' },
    { name: 'Blocked', value: c.blockedStudents, color: '#ef4444' },
    { name: 'Rejected', value: c.rejectedStudents, color: '#dc2626' },
  ].filter((s) => s.value > 0)

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Real-time overview of students, content, and engagement"
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setView({ name: 'admin/students' })}><UserPlus className="w-4 h-4 mr-1" /> Approve Students</Button>
            <Button size="sm" variant="outline" onClick={() => setView({ name: 'admin/batches' })}><Plus className="w-4 h-4 mr-1" /> New Batch</Button>
            <Button size="sm" onClick={() => setView({ name: 'admin/tests' })} className="bg-blue-700 hover:bg-blue-800"><FileQuestion className="w-4 h-4 mr-1" /> Create Test</Button>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total Students" value={c.totalStudents} icon={Users} color="blue" />
        <StatCard label="Pending" value={c.pendingStudents} icon={Clock} color="amber" />
        <StatCard label="Active" value={c.activeStudents} icon={UserCheck} color="teal" />
        <StatCard label="Blocked" value={c.blockedStudents} icon={Ban} color="rose" />
        <StatCard label="Batches" value={c.totalBatches} icon={GraduationCap} color="violet" />
        <StatCard label="Active Batches" value={c.activeBatches} icon={GraduationCap} color="teal" />
        <StatCard label="Courses" value={c.totalCourses} icon={BookOpen} color="blue" />
        <StatCard label="Videos" value={c.totalVideos} icon={Video} color="violet" />
        <StatCard label="Tests" value={c.totalTests} icon={FileQuestion} color="amber" />
        <StatCard label="Tests Attempted" value={c.testsAttempted} icon={Activity} color="teal" />
        <StatCard label="Avg Score" value={`${c.averageScore}%`} icon={Award} color="teal" />
        <StatCard label="Watch Time" value={`${Math.round(c.totalWatchTimeSecs / 60)}m`} icon={TrendingUp} color="slate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Student growth */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Student Growth (Last 8 Weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.studentGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="registered" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Registered" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={(e: any) => `${e.name}: ${e.value}`}>
                  {statusPie.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Batch enrollment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Batch Enrollment</CardTitle>
          </CardHeader>
          <CardContent>
            {data.batchEnrollment.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-8">No batches yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.batchEnrollment} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="enrolled" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top videos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Watched Videos</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topVideos.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-8">No video engagement yet</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto scroll-thin">
                {data.topVideos.map((v, i) => (
                  <div key={v.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{v.title}</div>
                      <div className="text-xs text-slate-500">{v.viewers} viewers · avg {v.avgCompletion}% · {v.completed} completed</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-8">No recent activity</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto scroll-thin">
                {data.recentActivity.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900">{a.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                      <div className="text-xs text-slate-500">{a.actorRole || 'system'} · {a.entityType} {a.entityId ? `· ${a.entityId.slice(-6)}` : ''}</div>
                    </div>
                    <div className="text-xs text-slate-400">{relativeTime(a.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent registrations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentRegistrations.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-8">No registrations yet</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto scroll-thin">
                {data.recentRegistrations.map((s) => (
                  <button key={s.id} onClick={() => setView({ name: 'admin/students/detail', id: s.id })} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 text-left">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white font-semibold text-xs">
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.name}</div>
                      <div className="text-xs text-slate-500 truncate">{s.email}</div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${statusColor(s.status)}`}>{s.status}</Badge>
                    <div className="text-xs text-slate-400">{fmtDateTime(s.createdAt)}</div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
