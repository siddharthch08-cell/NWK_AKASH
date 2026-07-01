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
import { Plus, Search, FolderOpen, Loader2, ExternalLink, Trash2, Edit3, Archive } from 'lucide-react'
import { fmtDate } from '@/lib/format'
import { getPlatformLabel, getPlatformColor, type MaterialPlatform } from '@/lib/material-url'
import { toast } from 'sonner'

interface Material {
  id: string; title: string; description?: string | null
  platform: string; externalUrl: string; materialType: string
  courseId: string; chapterId: string; topicId?: string | null
  archived: boolean; published: boolean; createdAt: string
  course: { id: string; title: string }
  chapter: { id: string; title: string }
  topic: { id: string; title: string } | null
}
interface ListResp { items: Material[]; page: number; pageSize: number; total: number; totalPages: number }

export function AdminMaterials() {
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
    api.get<ListResp>(`/api/admin/materials?${params}`).then(setData).catch((e) => toastAction.error(e)).finally(() => setLoading(false))
  }
  useEffect(load, [page, search])

  const archive = async (id: string) => {
    if (!confirm('Archive this resource? Students will no longer see it.')) return
    try { await api.del(`/api/admin/materials/${id}`); toast.success('Resource archived'); load() }
    catch (e) { toastAction.error(e) }
  }

  const deletePermanent = async (id: string) => {
    if (!confirm('Permanently delete this resource? This cannot be undone.')) return
    try { await api.del(`/api/admin/materials/${id}?permanent=true`); toast.success('Resource deleted'); load() }
    catch (e) { toastAction.error(e) }
  }

  return (
    <div>
      <PageHeader title="Study Materials" subtitle="Manage Notes/PDF links (Telegram, WhatsApp, Google Drive)"
        actions={<Button size="sm" onClick={() => setCreateOpen(true)} className="bg-blue-700 hover:bg-blue-800"><Plus className="w-4 h-4 mr-1" /> Add Notes / PDF Link</Button>} />

      <Card className="mb-4"><CardContent className="pt-4">
        <div className="relative"><Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" /><Input placeholder="Search materials…" className="pl-8" onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        {loading ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div> : !data || data.items.length === 0 ? <EmptyState icon={FolderOpen} title="No study materials found" message="Add your first Notes/PDF link with a Telegram, WhatsApp, or Google Drive URL." /> : (
          <div className="divide-y">
            {data.items.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{m.title}</span>
                    <Badge variant="outline" className={`text-xs ${getPlatformColor(m.platform)}`}>{getPlatformLabel(m.platform)}</Badge>
                    <Badge variant="outline" className="text-xs">{m.materialType}</Badge>
                    {!m.published && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">Draft</Badge>}
                    {m.archived && <Badge variant="outline" className="text-xs bg-slate-100 text-slate-500">Archived</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {m.course.title} → {m.chapter.title}{m.topic ? ` → ${m.topic.title}` : ''} · {fmtDate(m.createdAt)}
                  </div>
                </div>
                <a href={m.externalUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" title="Open resource"><ExternalLink className="w-4 h-4" /></Button>
                </a>
                <Button variant="ghost" size="sm" onClick={() => archive(m.id)} title="Archive"><Archive className="w-4 h-4 text-amber-600" /></Button>
                <Button variant="ghost" size="sm" onClick={() => deletePermanent(m.id)} title="Delete permanently"><Trash2 className="w-4 h-4 text-rose-500" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>

      <AddMaterialDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load() }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Material Dialog — dependent selectors: Batch → Course → Chapter → Topic
// ---------------------------------------------------------------------------
function AddMaterialDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const toastAction = useToastAction()
  const [form, setForm] = useState({
    title: '', description: '', platform: 'TELEGRAM' as MaterialPlatform,
    externalUrl: '', materialType: 'PDF', published: true,
  })
  const [batchId, setBatchId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [topicId, setTopicId] = useState('')

  const [batches, setBatches] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [chapters, setChapters] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  // Load active batches when dialog opens
  useEffect(() => {
    if (open) {
      api.get<{ items: any[] }>('/api/admin/batches?status=ACTIVE&pageSize=100').then((d) => setBatches(d.items)).catch(() => {})
      // Reset form
      setForm({ title: '', description: '', platform: 'TELEGRAM', externalUrl: '', materialType: 'PDF', published: true })
      setBatchId(''); setCourseId(''); setChapterId(''); setTopicId('')
      setCourses([]); setChapters([]); setTopics([])
    }
  }, [open])

  // When batch changes, load assigned published courses
  useEffect(() => {
    if (!batchId) { setCourses([]); setCourseId(''); return }
    setCourseId(''); setChapterId(''); setTopicId(''); setChapters([]); setTopics([])
    api.get<{ items: any[] }>(`/api/admin/courses?batchId=${batchId}&status=PUBLISHED&pageSize=100`).then((d) => setCourses(d.items)).catch(() => {})
  }, [batchId])

  // When course changes, load chapters
  useEffect(() => {
    if (!courseId) { setChapters([]); setChapterId(''); return }
    setChapterId(''); setTopicId(''); setTopics([])
    api.get<{ chapters: any[] }>(`/api/admin/courses/${courseId}/chapters`).then((d) => setChapters(d.chapters)).catch(() => {})
  }, [courseId])

  // When chapter changes, load topics
  useEffect(() => {
    if (!chapterId) { setTopics([]); setTopicId(''); return }
    setTopicId('')
    api.get<{ topics: any[] }>(`/api/admin/chapters/${chapterId}/topics`).then((d) => setTopics(d.topics)).catch(() => {})
  }, [chapterId])

  const submit = async () => {
    if (!batchId || !courseId || !chapterId || !form.title || !form.externalUrl) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/admin/materials', {
        batchId, courseId, chapterId, topicId: topicId || null,
        title: form.title, description: form.description || null,
        platform: form.platform, externalUrl: form.externalUrl,
        materialType: form.materialType, published: form.published,
      })
      toast.success('Study Material created')
      onCreated()
    } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }

  const platformPlaceholder: Record<MaterialPlatform, string> = {
    TELEGRAM: 'https://t.me/...',
    WHATSAPP: 'https://chat.whatsapp.com/... or https://wa.me/...',
    GOOGLE_DRIVE: 'https://drive.google.com/file/d/...',
    OTHER: 'https://...',
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Notes / PDF Link</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {/* Step 1: Active Batch */}
          <div>
            <Label>Active Batch *</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select an active batch" /></SelectTrigger>
              <SelectContent>
                {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">Resource will be available to all active batches assigned to the selected course.</p>
          </div>

          {/* Step 2: Course (filtered by batch) */}
          <div>
            <Label>Course *</Label>
            <Select value={courseId} onValueChange={setCourseId} disabled={!batchId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={batchId ? 'Select a course' : 'Select a batch first'} /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Step 3: Chapter (filtered by course) */}
          <div>
            <Label>Chapter *</Label>
            <Select value={chapterId} onValueChange={setChapterId} disabled={!courseId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={courseId ? 'Select a chapter' : 'Select a course first'} /></SelectTrigger>
              <SelectContent>
                {chapters.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Step 4: Topic (optional, filtered by chapter) */}
          <div>
            <Label>Topic (optional)</Label>
            <Select value={topicId} onValueChange={setTopicId} disabled={!chapterId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={chapterId ? 'Select a topic (optional)' : 'Select a chapter first'} /></SelectTrigger>
              <SelectContent>
                {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Step 5: Resource details */}
          <div>
            <Label>Notes / PDF Name *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Indian Penal Code Chapter 1 Notes" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Resource Type</Label>
              <Select value={form.materialType} onValueChange={(v) => setForm({ ...form, materialType: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOTES">Notes</SelectItem>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="QUESTION_PAPER">Question Paper</SelectItem>
                  <SelectItem value="REFERENCE">Reference</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v as MaterialPlatform })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TELEGRAM">Telegram</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="GOOGLE_DRIVE">Google Drive</SelectItem>
                  <SelectItem value="OTHER">Other Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Telegram, WhatsApp or Drive Link *</Label>
            <Input value={form.externalUrl} onChange={(e) => setForm({ ...form, externalUrl: e.target.value })} placeholder={platformPlaceholder[form.platform]} />
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="published" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="rounded" />
            <Label htmlFor="published" className="text-sm font-normal cursor-pointer">Publish immediately (students can see it)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !batchId || !courseId || !chapterId || !form.title || !form.externalUrl} className="bg-blue-700 hover:bg-blue-800">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Add Resource
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
