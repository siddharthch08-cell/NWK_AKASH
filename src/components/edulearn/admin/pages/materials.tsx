'use client'

import { useEffect, useState, useRef } from 'react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, FolderOpen, Loader2, Download, Trash2, FileText, UploadCloud } from 'lucide-react'
import { fmtDate } from '@/lib/format'
import { toast } from 'sonner'

interface Material {
  id: string; title: string; description?: string | null; fileName: string; fileType: string; fileSize: number
  materialType: string; visibility: string; createdAt: string
  batch?: { id: string; name: string } | null
  course?: { id: string; title: string } | null
  uploader: { name: string }
}
interface ListResp { items: Material[]; page: number; pageSize: number; total: number; totalPages: number }

export function AdminMaterials() {
  const toastAction = useToastAction()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const pageSize = 10

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search) params.set('search', search)
    api.get<ListResp>(`/api/admin/materials?${params}`).then(setData).catch((e) => toastAction.error(e)).finally(() => setLoading(false))
  }
  useEffect(load, [page, search])

  const download = async (id: string, name: string) => {
    const token = window.localStorage.getItem('edulearn_access_token')
    const res = await fetch(`/api/admin/materials/${id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) return toast.error('Download failed')
    const blob = await res.blob()
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
  }

  const remove = async (id: string) => {
    if (!confirm('Archive this material? Students will no longer be able to access it.')) return
    try { await api.del(`/api/admin/materials/${id}`); toast.success('Material archived'); load() }
    catch (e) { toastAction.error(e) }
  }

  return (
    <div>
      <PageHeader title="Study Material" subtitle="Upload and manage PDFs, assignments, and reference files"
        actions={<Button size="sm" onClick={() => setUploadOpen(true)} className="bg-blue-700 hover:bg-blue-800"><Plus className="w-4 h-4 mr-1" /> Upload Material</Button>} />

      <Card className="mb-4"><CardContent className="pt-4">
        <div className="relative"><Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" /><Input placeholder="Search materials…" className="pl-8" onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        {loading ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div> : !data || data.items.length === 0 ? <EmptyState icon={FolderOpen} title="No materials found" message="Upload your first PDF, assignment, or reference file." /> : (
          <div className="divide-y">
            {data.items.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-rose-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.title}</div>
                  <div className="text-xs text-slate-500 truncate">{m.fileName} · {(m.fileSize / 1024).toFixed(0)} KB · {m.materialType} · {fmtDate(m.createdAt)}</div>
                </div>
                {m.batch && <Badge variant="outline" className="hidden sm:inline-flex">{m.batch.name}</Badge>}
                <Button variant="ghost" size="sm" onClick={() => download(m.id, m.fileName)}><Download className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => remove(m.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={() => { setUploadOpen(false); load() }} />
    </div>
  )
}

function UploadDialog({ open, onClose, onUploaded }: { open: boolean; onClose: () => void; onUploaded: () => void }) {
  const toastAction = useToastAction()
  const [meta, setMeta] = useState({ title: '', description: '', materialType: 'NOTES', visibility: 'BATCH', batchId: '', courseId: '' })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([])
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      api.get<{ items: any[] }>('/api/admin/batches?pageSize=100').then((d) => setBatches(d.items)).catch(() => {})
      api.get<{ items: any[] }>('/api/admin/courses?pageSize=100').then((d) => setCourses(d.items)).catch(() => {})
    }
  }, [open])

  const submit = async () => {
    if (!file) { toast.error('Please select a file'); return }
    if (meta.visibility !== 'COURSE' && !meta.batchId) { toast.error('Please select a batch'); return }
    if (meta.visibility !== 'BATCH' && !meta.courseId) { toast.error('Please select a course'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('meta', JSON.stringify(meta))
      await api.upload('/api/admin/materials', fd)
      toast.success('Material uploaded')
      setMeta({ title: '', description: '', materialType: 'NOTES', visibility: 'BATCH', batchId: '', courseId: '' })
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onUploaded()
    } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Upload Study Material</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>File *</Label>
            <div className="mt-1 border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500" onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.doc,.docx,.xls,.xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setMeta((m) => ({ ...m, title: m.title || f.name })) } }} />
              {file ? <div className="text-sm"><FileText className="w-6 h-6 mx-auto text-rose-500 mb-1" />{file.name}<div className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</div></div> : <div className="text-sm text-slate-500"><UploadCloud className="w-6 h-6 mx-auto mb-1" />Click to select a file (max 20MB)</div>}
            </div>
          </div>
          <div><Label>Title *</Label><Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea rows={2} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><Select value={meta.materialType} onValueChange={(v) => setMeta({ ...meta, materialType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NOTES">Notes</SelectItem><SelectItem value="ASSIGNMENT">Assignment</SelectItem><SelectItem value="TEST_PAPER">Test Paper</SelectItem><SelectItem value="REFERENCE">Reference</SelectItem></SelectContent></Select></div>
            <div><Label>Visibility</Label><Select value={meta.visibility} onValueChange={(v) => setMeta({ ...meta, visibility: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BATCH">Batch</SelectItem><SelectItem value="COURSE">Course</SelectItem><SelectItem value="BATCH_AND_COURSE">Both</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Batch {meta.visibility !== 'COURSE' ? '*' : ''}</Label><Select value={meta.batchId} onValueChange={(v) => setMeta({ ...meta, batchId: v })}><SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger><SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Course {meta.visibility !== 'BATCH' ? '*' : ''}</Label><Select value={meta.courseId} onValueChange={(v) => setMeta({ ...meta, courseId: v })}><SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger><SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving || !file || !meta.title} className="bg-blue-700 hover:bg-blue-800">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Upload</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
