'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/stores/app-store'
import { api, ApiError } from '@/lib/api-client'
import { useToastAction } from '../../shared/admin-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, GraduationCap, BookOpen, FileQuestion, FolderOpen, Users, Download, UserPlus, UserMinus, Plus } from 'lucide-react'
import { fmtDate, statusColor, relativeTime } from '@/lib/format'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

interface BatchDetail {
  id: string; name: string; slug: string; description?: string | null; thumbnail?: string | null
  startDate?: string | null; endDate?: string | null; status: string; capacity?: number | null
  creator: { name: string; email: string }
  courses: { course: { id: string; title: string; slug: string; status: string; thumbnail?: string | null } }[]
  tests: { test: { id: string; title: string; status: string; durationMins: number } }[]
  enrollments: { user: { id: string; name: string; email: string; status: string }; enrolledAt: string }[]
  _count: { enrollments: number; courses: number; tests: number; materials: number; announcements: number }
}

export function AdminBatchDetail({ id }: { id: string }) {
  const { setView } = useApp()
  const toastAction = useToastAction()
  const [data, setData] = useState<BatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [assignOpen, setAssignOpen] = useState(false)

  const load = () => {
    setLoading(true)
    api.get<{ batch: BatchDetail }>(`/api/admin/batches/${id}`).then((d) => setData(d.batch)).catch((e) => toastAction.error(e)).finally(() => setLoading(false))
  }
  useEffect(load, [id])

  if (loading || !data) return <div className="text-center py-12 text-slate-500">Loading…</div>

  const exportEnrollment = async () => {
    const token = window.localStorage.getItem('edulearn_access_token')
    const res = await fetch(`/api/admin/batches/${id}/export`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) return toast.error('Export failed')
    const blob = await res.blob()
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${data.slug}-enrollment.csv`; a.click()
  }

  const removeStudent = async (userId: string) => {
    if (!confirm('Remove this student from the batch? Their test attempts will be preserved.')) return
    try {
      await api.post(`/api/admin/batches/${id}/remove-student`, { userId })
      toast.success('Student removed')
      load()
    } catch (e) { toastAction.error(e) }
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => setView({ name: 'admin/batches' })} className="mb-3"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Batches</Button>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {data.thumbnail ? <img src={data.thumbnail} alt="" className="w-full sm:w-48 h-32 sm:h-32 rounded-lg object-cover" /> : <div className="w-full sm:w-48 h-32 rounded-lg bg-slate-100 flex items-center justify-center"><GraduationCap className="w-10 h-10 text-slate-400" /></div>}
        <div className="flex-1">
          <div className="flex items-center gap-2"><h1 className="text-2xl font-bold">{data.name}</h1><Badge variant="outline" className={statusColor(data.status)}>{data.status}</Badge></div>
          <p className="text-sm text-slate-600 mt-1">{data.description || 'No description'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-sm">
            <div><span className="text-slate-500">Start:</span> {fmtDate(data.startDate)}</div>
            <div><span className="text-slate-500">End:</span> {fmtDate(data.endDate)}</div>
            <div><span className="text-slate-500">Capacity:</span> {data.capacity || '∞'}</div>
            <div><span className="text-slate-500">Slug:</span> <code className="text-xs">{data.slug}</code></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card><CardContent className="pt-4 text-center"><Users className="w-5 h-5 mx-auto text-blue-600 mb-1" /><div className="text-xl font-bold">{data._count.enrollments}</div><div className="text-xs text-slate-500">Students</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><BookOpen className="w-5 h-5 mx-auto text-teal-600 mb-1" /><div className="text-xl font-bold">{data._count.courses}</div><div className="text-xs text-slate-500">Courses</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><FileQuestion className="w-5 h-5 mx-auto text-amber-600 mb-1" /><div className="text-xl font-bold">{data._count.tests}</div><div className="text-xs text-slate-500">Tests</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><FolderOpen className="w-5 h-5 mx-auto text-violet-600 mb-1" /><div className="text-xl font-bold">{data._count.materials}</div><div className="text-xs text-slate-500">Materials</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><Plus className="w-5 h-5 mx-auto text-slate-600 mb-1" /><div className="text-xl font-bold">{data._count.announcements}</div><div className="text-xs text-slate-500">Announcements</div></CardContent></Card>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students ({data.enrollments.length})</TabsTrigger>
          <TabsTrigger value="courses">Courses ({data.courses.length})</TabsTrigger>
          <TabsTrigger value="tests">Tests ({data.tests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card><CardHeader><CardTitle className="text-base flex justify-between">Enrolled Students<Button size="sm" onClick={() => setAssignOpen(true)}><UserPlus className="w-4 h-4 mr-1" /> Assign</Button></CardTitle></CardHeader>
            <CardContent>
              {data.enrollments.length === 0 ? <div className="text-center py-8 text-sm text-slate-500">No students enrolled yet.</div> : (
                <div className="space-y-1">
                  {data.enrollments.map((e) => (
                    <div key={e.user.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                      <button onClick={() => setView({ name: 'admin/students/detail', id: e.user.id })} className="flex items-center gap-2 hover:underline">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white text-xs font-semibold">{e.user.name.charAt(0)}</div>
                        <div><div className="text-sm font-medium">{e.user.name}</div><div className="text-xs text-slate-500">{e.user.email} · enrolled {relativeTime(e.enrolledAt)}</div></div>
                      </button>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusColor(e.user.status)}>{e.user.status}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => removeStudent(e.user.id)}><UserMinus className="w-4 h-4 text-rose-500" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {data.enrollments.length > 0 && <Button variant="outline" size="sm" className="mt-3" onClick={exportEnrollment}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <Card><CardContent className="pt-4">
            {data.courses.length === 0 ? <div className="text-center py-8 text-sm text-slate-500">No courses assigned. Assign courses from the Courses page.</div> : (
              <div className="space-y-1">
                {data.courses.map((bc) => (
                  <button key={bc.course.id} onClick={() => setView({ name: 'admin/courses/detail', id: bc.course.id })} className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-left">
                    {bc.course.thumbnail ? <img src={bc.course.thumbnail} alt="" className="w-9 h-9 rounded object-cover" /> : <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center"><BookOpen className="w-4 h-4 text-slate-400" /></div>}
                    <div className="flex-1"><div className="text-sm font-medium">{bc.course.title}</div><div className="text-xs text-slate-500">{bc.course.slug}</div></div>
                    <Badge variant="outline" className={statusColor(bc.course.status)}>{bc.course.status}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="tests">
          <Card><CardContent className="pt-4">
            {data.tests.length === 0 ? <div className="text-center py-8 text-sm text-slate-500">No tests assigned. Assign tests from the Tests page.</div> : (
              <div className="space-y-1">
                {data.tests.map((bt) => (
                  <button key={bt.test.id} onClick={() => setView({ name: 'admin/tests/detail', id: bt.test.id })} className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-left">
                    <FileQuestion className="w-4 h-4 text-amber-600" />
                    <div className="flex-1"><div className="text-sm font-medium">{bt.test.title}</div><div className="text-xs text-slate-500">{bt.test.durationMins} minutes</div></div>
                    <Badge variant="outline" className={statusColor(bt.test.status)}>{bt.test.status}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <AssignStudentsDialog batchId={id} open={assignOpen} onClose={() => setAssignOpen(false)} onAssigned={load} />
    </div>
  )
}

function AssignStudentsDialog({ batchId, open, onClose, onAssigned }: { batchId: string; open: boolean; onClose: () => void; onAssigned: () => void }) {
  const toastAction = useToastAction()
  const [students, setStudents] = useState<{ id: string; name: string; email: string; status: string }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      api.get<{ items: any[] }>('/api/admin/students?pageSize=100').then((d) => setStudents(d.items)).catch(() => {})
      setSelected(new Set())
    }
  }, [open])

  const toggle = (id: string) => { const n = new Set(selected); if (n.has(id)) n.delete(id); else n.add(id); setSelected(n) }

  const submit = async () => {
    if (selected.size === 0) return
    setSaving(true)
    try {
      const res = await api.post<{ added: number }>(`/api/admin/batches/${batchId}/assign-students`, { userIds: Array.from(selected) })
      toast.success(`Enrolled ${res.added} student(s)`)
      onAssigned()
      onClose()
    } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }

  const filtered = students.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Assign Students to Batch</DialogTitle></DialogHeader>
        <input placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
        <ScrollArea className="h-72 border rounded">
          {filtered.map((s) => (
            <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
              <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
              <div className="flex-1"><div className="text-sm font-medium">{s.name}</div><div className="text-xs text-slate-500">{s.email}</div></div>
              <Badge variant="outline" className={statusColor(s.status)}>{s.status}</Badge>
            </label>
          ))}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={selected.size === 0 || saving} className="bg-blue-700 hover:bg-blue-800">Enroll {selected.size || ''}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
