'use client'

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
import { Plus, Search, GraduationCap, Loader2, Eye, ChevronLeft, ChevronRight, Edit3, Trash2 } from 'lucide-react'
import { fmtDate, statusColor } from '@/lib/format'
import { slugify } from '@/lib/format'
import { toast } from 'sonner'

interface Batch {
  id: string; name: string; slug: string; description?: string | null; thumbnail?: string | null
  startDate?: string | null; endDate?: string | null; status: string; capacity?: number | null
  enrolledCount: number; courseCount: number; testCount: number; createdAt: string
}
interface ListResp { items: Batch[]; page: number; pageSize: number; total: number; totalPages: number }

export function AdminBatches() {
  const { setView } = useApp()
  const toastAction = useToastAction()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editBatch, setEditBatch] = useState<Batch | null>(null)
  const pageSize = 10

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search) params.set('search', search)
    if (status !== 'ALL') params.set('status', status)
    api.get<ListResp>(`/api/admin/batches?${params}`).then(setData).catch((e) => toastAction.error(e)).finally(() => setLoading(false))
  }
  useEffect(load, [page, search, status])

  const deleteBatch = async (id: string, name: string) => {
    if (!confirm(`Delete batch "${name}"?\n\nThis will archive the batch. If the batch has no enrollments, courses, tests, or announcements, it will be permanently deleted.`)) return
    try { await api.del(`/api/admin/batches/${id}`); toast.success('Batch deleted'); load() } catch (e) { toastAction.error(e) }
  }

  return (
    <div>
      <PageHeader
        title="Batches"
        subtitle="Create and manage student batches"
        actions={<Button size="sm" onClick={() => setCreateOpen(true)} className="bg-blue-700 hover:bg-blue-800"><Plus className="w-4 h-4 mr-1" /> New Batch</Button>}
      />

      <Card className="mb-4">
        <CardContent className="pt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1"><Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" /><Input placeholder="Search batches…" className="pl-8" onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent>
            <SelectItem value="ALL">All</SelectItem><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="UPCOMING">Upcoming</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="COMPLETED">Completed</SelectItem><SelectItem value="ARCHIVED">Archived</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent></Select>
        </CardContent>
      </Card>

      <Card><CardContent className="p-0">
        {loading ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div> : !data || data.items.length === 0 ? <EmptyState icon={GraduationCap} title="No batches found" message="Create your first batch to get started." action={<Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1" /> New Batch</Button>} /> : (
          <>
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead>Batch</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Start</TableHead><TableHead className="hidden md:table-cell">End</TableHead><TableHead>Enrolled</TableHead><TableHead className="hidden lg:table-cell">Courses</TableHead><TableHead className="hidden lg:table-cell">Tests</TableHead><TableHead className="w-10"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.items.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell><button onClick={() => setView({ name: 'admin/batches/detail', id: b.id })} className="flex items-center gap-2 text-left hover:underline">
                      {b.thumbnail ? <img src={b.thumbnail} alt="" className="w-9 h-9 rounded object-cover" /> : <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center"><GraduationCap className="w-4 h-4 text-slate-400" /></div>}
                      <div><div className="font-medium">{b.name}</div><div className="text-xs text-slate-500">{b.slug}</div></div>
                    </button></TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(b.status)}>{b.status}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{fmtDate(b.startDate)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{fmtDate(b.endDate)}</TableCell>
                    <TableCell className="text-sm">{b.enrolledCount}{b.capacity ? `/${b.capacity}` : ''}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{b.courseCount}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{b.testCount}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setView({ name: 'admin/batches/detail', id: b.id })} title="View"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditBatch(b)} title="Edit" className="text-blue-600"><Edit3 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteBatch(b.id, b.name)} title="Delete" className="text-rose-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></Button>
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

      <CreateBatchDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load() }} />
      {editBatch && <EditBatchDialog batch={editBatch} onClose={() => setEditBatch(null)} onSaved={() => { setEditBatch(null); load() }} />}
    </div>
  )
}

function CreateBatchDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const toastAction = useToastAction()
  const [form, setForm] = useState({ name: '', slug: '', description: '', thumbnail: '', startDate: '', endDate: '', status: 'DRAFT', capacity: '' })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await api.post('/api/admin/batches', {
        name: form.name, slug: form.slug || slugify(form.name), description: form.description || undefined,
        thumbnail: form.thumbnail || undefined, startDate: form.startDate || undefined, endDate: form.endDate || undefined,
        status: form.status, capacity: form.capacity ? parseInt(form.capacity) : undefined,
      })
      toast.success('Batch created')
      setForm({ name: '', slug: '', description: '', thumbnail: '', startDate: '', endDate: '', status: 'DRAFT', capacity: '' })
      onCreated()
    } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create New Batch</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Batch Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} /></div>
          <div><Label>Slug (URL)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated if blank" /></div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Thumbnail URL</Label><Input value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="UPCOMING">Upcoming</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="COMPLETED">Completed</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent></Select></div>
            <div><Label>Capacity (optional)</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving || !form.name} className="bg-blue-700 hover:bg-blue-800">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// EditBatchDialog — edit batch with merged date validation
// ---------------------------------------------------------------------------
function EditBatchDialog({ batch, onClose, onSaved }: { batch: Batch; onClose: () => void; onSaved: () => void }) {
  const toastAction = useToastAction()
  const [form, setForm] = useState({
    name: batch.name,
    slug: batch.slug,
    description: batch.description || '',
    thumbnail: batch.thumbnail || '',
    startDate: batch.startDate ? new Date(batch.startDate).toISOString().slice(0, 10) : '',
    endDate: batch.endDate ? new Date(batch.endDate).toISOString().slice(0, 10) : '',
    status: batch.status,
    capacity: batch.capacity ? String(batch.capacity) : '',
  })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    // Merged date validation: check final start/end pair
    const startDate = form.startDate || null
    const endDate = form.endDate || null
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error('End date must be after start date')
      return
    }

    setSaving(true)
    try {
      await api.patch(`/api/admin/batches/${batch.id}`, {
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description || undefined,
        thumbnail: form.thumbnail || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        status: form.status,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
      })
      toast.success('Batch updated')
      onSaved()
    } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit Batch</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Batch Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Thumbnail URL</Label><Input value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="UPCOMING">Upcoming</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="COMPLETED">Completed</SelectItem><SelectItem value="ARCHIVED">Archived</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent></Select></div>
            <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving || !form.name} className="bg-blue-700 hover:bg-blue-800">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Save Changes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
