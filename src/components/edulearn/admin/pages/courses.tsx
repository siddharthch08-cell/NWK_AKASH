'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/stores/app-store'
import { api, ApiError } from '@/lib/api-client'
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
import { Plus, Search, BookOpen, Loader2, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { fmtDate, statusColor, slugify } from '@/lib/format'
import { toast } from 'sonner'

interface Course {
  id: string; title: string; slug: string; description?: string | null; thumbnail?: string | null
  category?: string | null; status: string; chapterCount: number; batchCount: number; createdAt: string
}
interface ListResp { items: Course[]; page: number; pageSize: number; total: number; totalPages: number }

export function AdminCourses() {
  const { setView } = useApp()
  const toastAction = useToastAction()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const pageSize = 10

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search) params.set('search', search)
    api.get<ListResp>(`/api/admin/courses?${params}`).then(setData).catch((e) => toastAction.error(e)).finally(() => setLoading(false))
  }
  useEffect(load, [page, search])

  return (
    <div>
      <PageHeader title="Courses & Content" subtitle="Manage courses, chapters, topics, and video lectures"
        actions={<Button size="sm" onClick={() => setCreateOpen(true)} className="bg-blue-700 hover:bg-blue-800"><Plus className="w-4 h-4 mr-1" /> New Course</Button>} />

      <Card className="mb-4"><CardContent className="pt-4">
        <div className="relative"><Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" /><Input placeholder="Search courses…" className="pl-8" onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        {loading ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div> : !data || data.items.length === 0 ? <EmptyState icon={BookOpen} title="No courses found" message="Create your first course to start adding content." /> : (
          <>
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead>Course</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Category</TableHead><TableHead>Chapters</TableHead><TableHead className="hidden lg:table-cell">Batches</TableHead><TableHead className="hidden md:table-cell">Created</TableHead><TableHead className="w-10"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><button onClick={() => setView({ name: 'admin/courses/detail', id: c.id })} className="flex items-center gap-2 hover:underline">
                      {c.thumbnail ? <img src={c.thumbnail} alt="" className="w-9 h-9 rounded object-cover" /> : <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center"><BookOpen className="w-4 h-4 text-slate-400" /></div>}
                      <div><div className="font-medium">{c.title}</div><div className="text-xs text-slate-500">{c.slug}</div></div>
                    </button></TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(c.status)}>{c.status}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{c.category || '—'}</TableCell>
                    <TableCell className="text-sm">{c.chapterCount}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{c.batchCount}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-slate-500">{fmtDate(c.createdAt)}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => setView({ name: 'admin/courses/detail', id: c.id })}><Eye className="w-4 h-4" /></Button></TableCell>
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

      <CreateCourseDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load() }} />
    </div>
  )
}

function CreateCourseDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const toastAction = useToastAction()
  const [form, setForm] = useState({ title: '', slug: '', description: '', thumbnail: '', category: '', status: 'DRAFT' })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await api.post('/api/admin/courses', {
        title: form.title, slug: form.slug || slugify(form.title), description: form.description || undefined,
        thumbnail: form.thumbnail || undefined, category: form.category || undefined, status: form.status,
      })
      toast.success('Course created')
      setForm({ title: '', slug: '', description: '', thumbnail: '', category: '', status: 'DRAFT' })
      onCreated()
    } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
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
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving || !form.title} className="bg-blue-700 hover:bg-blue-800">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
