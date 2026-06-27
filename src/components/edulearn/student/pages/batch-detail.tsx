'use client'

import { useApp } from '@/stores/app-store'
import { useApi } from '../../shared/admin-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookOpen, FileQuestion, FolderOpen, Megaphone, GraduationCap } from 'lucide-react'
import { fmtDate, statusColor, relativeTime } from '@/lib/format'

export function StudentBatchDetail({ id }: { id: string }) {
  const { setView } = useApp()
  const { data, loading } = useApi<{ batch: any }>(`/api/student/batches/${id}`)

  if (loading || !data) return <div className="text-center py-12 text-slate-500">Loading…</div>
  const b = data.batch

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => setView({ name: 'student/batches' })} className="mb-3"><ArrowLeft className="w-4 h-4 mr-1" /> Back to My Batches</Button>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {b.thumbnail ? <img src={b.thumbnail} alt="" className="w-full sm:w-48 h-32 rounded-lg object-cover" /> : <div className="w-full sm:w-48 h-32 rounded-lg bg-slate-100 flex items-center justify-center"><GraduationCap className="w-10 h-10 text-slate-400" /></div>}
        <div className="flex-1">
          <div className="flex items-center gap-2"><h1 className="text-2xl font-bold">{b.name}</h1><Badge variant="outline" className={statusColor(b.status)}>{b.status}</Badge></div>
          <p className="text-sm text-slate-600 mt-1">{b.description || 'No description'}</p>
          <div className="text-xs text-slate-500 mt-2">Start: {fmtDate(b.startDate)} · End: {fmtDate(b.endDate)}</div>
        </div>
      </div>

      {/* Announcements */}
      {b.announcements && b.announcements.length > 0 && (
        <Card className="mb-4"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="w-5 h-5 text-amber-600" /> Batch Announcements</CardTitle></CardHeader>
          <CardContent><div className="space-y-2">
            {b.announcements.map((a: any) => (
              <div key={a.id} className="p-2 rounded border"><div className="font-medium text-sm">{a.title}</div><div className="text-xs text-slate-600 mt-1">{a.message}</div><div className="text-[10px] text-slate-400 mt-1">{relativeTime(a.publishAt)}</div></div>
            ))}
          </div></CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-5 h-5 text-teal-600" /> Courses</CardTitle></CardHeader>
          <CardContent>{b.courses && b.courses.length === 0 ? <div className="text-sm text-slate-500">No courses assigned.</div> : (
            <div className="space-y-1">{b.courses?.map((bc: any) => (
              <button key={bc.course.id} onClick={() => setView({ name: 'student/courses/detail', id: bc.course.id })} className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-left">
                {bc.course.thumbnail ? <img src={bc.course.thumbnail} alt="" className="w-9 h-9 rounded object-cover" /> : <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center"><BookOpen className="w-4 h-4 text-slate-400" /></div>}
                <div className="flex-1"><div className="text-sm font-medium">{bc.course.title}</div></div>
                <Badge variant="outline" className={statusColor(bc.course.status)}>{bc.course.status}</Badge>
              </button>
            ))}</div>
          )}</CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><FileQuestion className="w-5 h-5 text-amber-600" /> Tests</CardTitle></CardHeader>
          <CardContent>{b.tests && b.tests.length === 0 ? <div className="text-sm text-slate-500">No tests assigned.</div> : (
            <div className="space-y-1">{b.tests?.map((bt: any) => (
              <button key={bt.test.id} onClick={() => setView({ name: 'student/tests' })} className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-left">
                <FileQuestion className="w-4 h-4 text-amber-600" />
                <div className="flex-1"><div className="text-sm font-medium">{bt.test.title}</div><div className="text-xs text-slate-500">{bt.test.durationMins} minutes</div></div>
                <Badge variant="outline" className={statusColor(bt.test.status)}>{bt.test.status}</Badge>
              </button>
            ))}</div>
          )}</CardContent>
        </Card>
      </div>

      {b.materials && b.materials.length > 0 && (
        <Card className="mt-4"><CardHeader><CardTitle className="text-base flex items-center gap-2"><FolderOpen className="w-5 h-5 text-violet-600" /> Study Material</CardTitle></CardHeader>
          <CardContent><div className="space-y-1">{b.materials.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between p-2 rounded border">
              <div><div className="text-sm font-medium">{m.title}</div><div className="text-xs text-slate-500">{m.fileName} · {m.materialType}</div></div>
              <Button variant="outline" size="sm" onClick={() => downloadMaterial(m.id, m.fileName)}>Download</Button>
            </div>
          ))}</div></CardContent>
        </Card>
      )}
    </div>
  )
}

async function downloadMaterial(id: string, name: string) {
  const token = window.localStorage.getItem('edulearn_access_token')
  const res = await fetch(`/api/student/materials/${id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) { alert('Download failed'); return }
  const blob = await res.blob()
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
}
