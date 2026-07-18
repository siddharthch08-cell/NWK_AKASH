'use client'

import { ExternalImage } from '@/components/ui/external-image'
import { useEffect, useState } from 'react'
import { useApp } from '@/stores/app-store'
import { api } from '@/lib/api-client'
import { useToastAction, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Search, BookOpen, Loader2, Eye, ChevronLeft, ChevronRight, AlertTriangle, Trash2 } from 'lucide-react'
import { fmtDate, statusColor, slugify } from '@/lib/format'
import { toast } from 'sonner'

interface Course {
  id: string; title: string; slug: string; description?: string | null; thumbnail?: string | null
  category?: string | null; status: string; chapterCount: number; batchCount: number; createdAt: string
}
interface ListResp { items: Course[]; page: number; pageSize: number; total: number; totalPages: number }
interface AssignableBatch { id: string; name: string; slug: string; description?: string | null; enrolledCount: number }

export function AdminCourses() {
  const { setView } = useApp()
  const toastAction = useToastAction()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const pageSize = 10

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search) params.set('search', search)
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    api.get<ListResp>(`/api/admin/courses?${params}`).then(setData).catch((e) => toastAction.error(e)).finally(() => setLoading(false))
  }
  useEffect(load, [page, search, statusFilter, toastAction])

  const deleteCourse = async (id: string, title: string) => {
    if (!confirm(`Archive course "${title}"?\n\nThis will hide it from students but content will be preserved.`)) return
    try { await api.del(`/api/admin/courses/${id}`); toast.success('Course archived'); load() } catch (e) { toastAction.error(e) }
  }

  return (
    <div>
      <PageHeader title="Courses & Content" subtitle="Manage courses, chapters, topics, and video lectures"
        actions={<Button size="sm" onClick={() => setCreateOpen(true)} className="bg-blue-700 hover:bg-blue-800"><Plus className="w-4 h-4 mr-1" /> New Course</Button>} />

      <Card className="mb-4"><CardContent className="pt-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1"><Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" /><Input placeholder="Search courses…" className="pl-8" onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        {loading ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div> : !data || data.items.length === 0 ? <EmptyState icon={BookOpen} title="No courses found" message="Create your first course to start adding content." /> : (
          <>
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead>Course</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Category</TableHead><TableHead>Chapters</TableHead><TableHead>Active Batches</TableHead><TableHead className="hidden md:table-cell">Created</TableHead><TableHead className="w-10"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><button onClick={() => setView({ name: 'admin/courses/detail', id: c.id })} className="flex items-center gap-2 hover:underline">
                      {c.thumbnail ? <ExternalImage src={c.thumbnail} alt="" className="w-9 h-9 rounded object-cover" /> : <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center"><BookOpen className="w-4 h-4 text-slate-400" /></div>}
                      <div><div className="font-medium">{c.title}</div><div className="text-xs text-slate-500">{c.slug}</div></div>
                    </button></TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(c.status)}>{c.status}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{c.category || '—'}</TableCell>
                    <TableCell className="text-sm">{c.chapterCount}</TableCell>
                    <TableCell className="text-sm">
                      {c.batchCount > 0 ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700">{c.batchCount} batch(es)</Badge>
                      ) : c.status === 'PUBLISHED' ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700"><AlertTriangle className="w-3 h-3 mr-1" />No active batch</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-slate-500">{fmtDate(c.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setView({ name: 'admin/courses/detail', id: c.id })} title="View"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteCourse(c.id, c.title)} title="Archive" className="text-rose-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
            {data.totalPages > 1 && <div className="flex items-center justify-between p-3 border-t">
              <div className="text-xs text-slate-500">Showing {(data.page - 1) * data.pageSize + 1}-{Math.min(data.page * data.pageSize, data.total)} of {data.total}</div>
              <div className="flex gap-1"><Button size="sm" variant="outline" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}><ChevronLeft className="w-4 h-4" /></Button><Button size="sm" variant="outline" disabled={data.page >= data.totalPages} onClick={() => setPage(data.page + 1)}><ChevronRight className="w-4 h-4" /></Button></div>
            </div>}
          </>
        )}
      </CardContent></Card>

      <CreateCourseDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); if (id) setView({ name: 'admin/courses/detail', id }) }} />
    </div>
  )
}

function CreateCourseDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id?: string) => void }) {
  const toastAction = useToastAction()
  const [form, setForm] = useState({ title: '', slug: '', description: '', thumbnail: '', category: '', status: 'PUBLISHED' })
  const [saving, setSaving] = useState(false)
  const [activeBatches, setActiveBatches] = useState<AssignableBatch[]>([])
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set())

  // Load ACTIVE batches when dialog opens
  useEffect(() => {
    if (open) {
      api.get<{ items: AssignableBatch[] }>('/api/admin/batches?status=ACTIVE&pageSize=100')
        .then((d) => setActiveBatches(d.items))
        .catch(() => {})
      setSelectedBatches(new Set())
    }
  }, [open])

  const toggleBatch = (id: string) => {
    const n = new Set(selectedBatches)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    setSelectedBatches(n)
  }

  const submit = async () => {
    setSaving(true)
    try {
      const res = await api.post<{ course: { id: string } }>('/api/admin/courses', {
        title: form.title,
        slug: form.slug || slugify(form.title),
        description: form.description || undefined,
        thumbnail: form.thumbnail || undefined,
        category: form.category || undefined,
        status: form.status,
        batchIds: Array.from(selectedBatches),
      })
      toast.success(`Course created${selectedBatches.size > 0 ? ` and assigned to ${selectedBatches.size} batch(es)` : ''}`)
      setForm({ title: '', slug: '', description: '', thumbnail: '', category: '', status: 'PUBLISHED' })
      onCreated(res.course.id)
    } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create New Course</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} /></div>
          <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Thumbnail URL</Label><Input value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="PUBLISHED">Published</SelectItem><SelectItem value="ARCHIVED">Archived</SelectItem></SelectContent></Select></div>
          </div>

          {/* Active Batch Assignment Section */}
          <div className="border-t pt-3">
            <Label className="text-sm font-semibold">Available in Active Batches</Label>
            <p className="text-xs text-slate-500 mb-2">Select which active batches should have this course. Content is created once and shared across all assigned batches.</p>
            {activeBatches.length === 0 ? (
              <div className="text-xs text-slate-400 p-3 border rounded bg-slate-50">No active batches available. Create an active batch first.</div>
            ) : (
              <ScrollArea className="h-40 border rounded">
                {activeBatches.map((b) => (
                  <label key={b.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                    <Checkbox checked={selectedBatches.has(b.id)} onCheckedChange={() => toggleBatch(b.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{b.name}</div>
                      <div className="text-xs text-slate-500 truncate">{b.description?.slice(0, 60) || b.slug}</div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">{b.enrolledCount || 0} students</Badge>
                  </label>
                ))}
              </ScrollArea>
            )}
            {selectedBatches.size > 0 && (
              <div className="text-xs text-blue-700 mt-1">This course will be available in {selectedBatches.size} batch(es).</div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.title} className="bg-blue-700 hover:bg-blue-800">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Create Course{selectedBatches.size > 0 ? ` + ${selectedBatches.size} Batch(es)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
