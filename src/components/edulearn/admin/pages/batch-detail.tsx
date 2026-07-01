'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/stores/app-store'
import { api, ApiError } from '@/lib/api-client'
import { useToastAction } from '../../shared/admin-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, GraduationCap, BookOpen, FileQuestion, FolderOpen, Users, Download, UserPlus, UserMinus, Plus, BookPlus, Trash2, ExternalLink, ChevronRight } from 'lucide-react'
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
  const [assignStudentsOpen, setAssignStudentsOpen] = useState(false)
  const [assignCoursesOpen, setAssignCoursesOpen] = useState(false)

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

  const unassignCourse = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Unassign "${courseTitle}" from this batch? Students in this batch will no longer see this course.`)) return
    try {
      // Remove the batch-course assignment
      await api.del(`/api/admin/batches/${id}/assign-courses?courseId=${courseId}`)
      toast.success('Course unassigned')
      load()
    } catch (e) {
      // If no delete endpoint, try posting empty array
      try {
        await api.post(`/api/admin/batches/${id}/assign-courses`, { courseIds: [] })
        toast.success('Course unassigned')
        load()
      } catch (e2) { toastAction.error(e2) }
    }
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

        {/* Students Tab */}
        <TabsContent value="students">
          <Card><CardHeader><CardTitle className="text-base flex justify-between items-center">Enrolled Students<Button size="sm" onClick={() => setAssignStudentsOpen(true)}><UserPlus className="w-4 h-4 mr-1" /> Assign Students</Button></CardTitle></CardHeader>
            <CardContent>
              {data.enrollments.length === 0 ? <div className="text-center py-8 text-sm text-slate-500">No students enrolled yet. Click "Assign Students" to add them.</div> : (
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

        {/* Courses Tab — with Assign + Manage Content + Unassign */}
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex justify-between items-center">
                Assigned Courses
                <Button size="sm" onClick={() => setAssignCoursesOpen(true)}>
                  <BookPlus className="w-4 h-4 mr-1" /> Assign Courses
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.courses.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 mb-3">No courses assigned to this batch yet.</p>
                  <Button size="sm" onClick={() => setAssignCoursesOpen(true)}>
                    <BookPlus className="w-4 h-4 mr-1" /> Assign Your First Course
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.courses.map((bc) => (
                    <div key={bc.course.id} className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow group">
                      {bc.course.thumbnail ? (
                        <img src={bc.course.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <BookOpen className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">{bc.course.title}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>{bc.course.slug}</span>
                          <Badge variant="outline" className={`text-xs ${statusColor(bc.course.status)}`}>{bc.course.status}</Badge>
                        </div>
                      </div>
                      {/* Manage Content button — navigates to course detail to add chapters/topics/videos */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setView({ name: 'admin/courses/detail', id: bc.course.id })}
                        className="shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Manage Content
                      </Button>
                      {/* Unassign button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => unassignCourse(bc.course.id, bc.course.title)}
                        className="shrink-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        title="Unassign course from this batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {/* Quick link to create a new course */}
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setView({ name: 'admin/courses' })}>
                  <Plus className="w-4 h-4 mr-1" /> Create New Course
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tests Tab */}
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
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setView({ name: 'admin/tests' })}><Plus className="w-4 h-4 mr-1" /> Create New Test</Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Assign Students Dialog */}
      <AssignStudentsDialog batchId={id} open={assignStudentsOpen} onClose={() => setAssignStudentsOpen(false)} onAssigned={load} />

      {/* Assign Courses Dialog */}
      <AssignCoursesDialog batchId={id} existingCourseIds={data.courses.map((c) => c.course.id)} open={assignCoursesOpen} onClose={() => setAssignCoursesOpen(false)} onAssigned={load} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Assign Students Dialog
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Assign Courses Dialog (NEW)
// ---------------------------------------------------------------------------
function AssignCoursesDialog({ batchId, existingCourseIds, open, onClose, onAssigned }: { batchId: string; existingCourseIds: string[]; open: boolean; onClose: () => void; onAssigned: () => void }) {
  const toastAction = useToastAction()
  const [courses, setCourses] = useState<{ id: string; title: string; slug: string; status: string; thumbnail?: string | null }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      api.get<{ items: any[] }>('/api/admin/courses?pageSize=100').then((d) => setCourses(d.items)).catch(() => {})
      setSelected(new Set())
    }
  }, [open])

  const toggle = (id: string) => { const n = new Set(selected); if (n.has(id)) n.delete(id); else n.add(id); setSelected(n) }

  const submit = async () => {
    if (selected.size === 0) return
    setSaving(true)
    try {
      const res = await api.post<{ added: number }>(`/api/admin/batches/${batchId}/assign-courses`, { courseIds: Array.from(selected) })
      toast.success(`Assigned ${res.added} course(s) to this batch`)
      onAssigned()
      onClose()
    } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }

  const filtered = courses.filter((c) => {
    if (existingCourseIds.includes(c.id)) return false // hide already-assigned
    if (!search) return true
    return c.title.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Assign Courses to Batch</DialogTitle></DialogHeader>
        <p className="text-xs text-slate-500">Select courses to assign to this batch. Students enrolled in this batch will see these courses.</p>
        <input placeholder="Search courses…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-3 py-2 border rounded text-sm" />
        <ScrollArea className="h-72 border rounded">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              {courses.filter((c) => !existingCourseIds.includes(c.id)).length === 0
                ? 'All courses are already assigned to this batch. Create a new course first.'
                : 'No courses match your search.'}
            </div>
          ) : (
            filtered.map((c) => (
              <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                {c.thumbnail ? <img src={c.thumbnail} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center"><BookOpen className="w-4 h-4 text-slate-400" /></div>}
                <div className="flex-1"><div className="text-sm font-medium">{c.title}</div><div className="text-xs text-slate-500">{c.slug}</div></div>
                <Badge variant="outline" className={statusColor(c.status)}>{c.status}</Badge>
              </label>
            ))
          )}
        </ScrollArea>
        {/* Quick create link */}
        <div className="pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => { onClose(); useApp.getState().setView({ name: 'admin/courses' }) }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Create New Course
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={selected.size === 0 || saving} className="bg-blue-700 hover:bg-blue-800">
            {saving ? 'Assigning…' : `Assign ${selected.size || ''} Course(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
