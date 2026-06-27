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
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Search, FileQuestion, Loader2, Eye, ChevronLeft, ChevronRight, Trash2, Copy, Send } from 'lucide-react'
import { fmtDateTime, statusColor } from '@/lib/format'
import { toast } from 'sonner'

interface Test {
  id: string; title: string; description?: string | null; durationMins: number; maxAttempts: number; maxQuestions: number
  startAt?: string | null; endAt?: string | null; status: string; passingPct?: number | null
  questionCount: number; attemptCount: number; batchCount: number; createdAt: string
}
interface ListResp { items: Test[]; page: number; pageSize: number; total: number; totalPages: number }

export function AdminTests() {
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
    api.get<ListResp>(`/api/admin/tests?${params}`).then(setData).catch((e) => toastAction.error(e)).finally(() => setLoading(false))
  }
  useEffect(load, [page, search])

  const publish = async (id: string) => {
    if (!confirm('Publish this test? Students will be able to attempt it.')) return
    try { await api.post(`/api/admin/tests/${id}/publish`); toast.success('Test published'); load() } catch (e) { toastAction.error(e) }
  }
  const duplicate = async (id: string) => {
    try { const res = await api.post<{ test: { id: string } }>(`/api/admin/tests/${id}/duplicate`); toast.success('Test duplicated'); setView({ name: 'admin/tests/detail', id: res.test.id }) } catch (e) { toastAction.error(e) }
  }
  const archive = async (id: string) => {
    if (!confirm('Archive this test?')) return
    try { await api.post(`/api/admin/tests/${id}/archive`); toast.success('Test archived'); load() } catch (e) { toastAction.error(e) }
  }

  return (
    <div>
      <PageHeader title="Tests & Assessments" subtitle="Create timed MCQ tests with up to 20 questions and 2 attempts"
        actions={<Button size="sm" onClick={() => setCreateOpen(true)} className="bg-blue-700 hover:bg-blue-800"><Plus className="w-4 h-4 mr-1" /> New Test</Button>} />

      <Card className="mb-4"><CardContent className="pt-4">
        <div className="relative"><Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" /><Input placeholder="Search tests…" className="pl-8" onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        {loading ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div> : !data || data.items.length === 0 ? <EmptyState icon={FileQuestion} title="No tests found" message="Create your first MCQ test to assess your students." /> : (
          <>
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead>Test</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Duration</TableHead><TableHead>Questions</TableHead><TableHead className="hidden md:table-cell">Attempts</TableHead><TableHead className="hidden lg:table-cell">Window</TableHead><TableHead className="w-10"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell><button onClick={() => setView({ name: 'admin/tests/detail', id: t.id })} className="hover:underline text-left">
                      <div className="font-medium">{t.title}</div><div className="text-xs text-slate-500">{t.maxAttempts} attempts max · {t.maxQuestions} Q max</div>
                    </button></TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(t.status)}>{t.status}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{t.durationMins}m</TableCell>
                    <TableCell className="text-sm">{t.questionCount}/{t.maxQuestions}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{t.attemptCount}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-slate-500">{t.startAt ? fmtDateTime(t.startAt) : '—'} → {t.endAt ? fmtDateTime(t.endAt) : '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {t.status === 'DRAFT' && <Button variant="ghost" size="icon" className="h-7 w-7" title="Publish" onClick={() => publish(t.id)}><Send className="w-3.5 h-3.5 text-emerald-600" /></Button>}
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicate" onClick={() => duplicate(t.id)}><Copy className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Archive" onClick={() => archive(t.id)}><ArchiveIcon /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setView({ name: 'admin/tests/detail', id: t.id })}><Eye className="w-4 h-4" /></Button>
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

      <CreateTestDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); setView({ name: 'admin/tests/detail', id }) }} />
    </div>
  )
}

function ArchiveIcon() {
  return <Trash2 className="w-3.5 h-3.5 text-slate-500" />
}

function CreateTestDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const toastAction = useToastAction()
  const [form, setForm] = useState({ title: '', description: '', instructions: 'This is a timed quiz. Read each question carefully before answering.', durationMins: '15', maxAttempts: '2', maxQuestions: '20', startAt: '', endAt: '', status: 'DRAFT', passingPct: '50', showAnswerKey: true, showResultImmediately: true })
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([])
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) api.get<{ items: any[] }>('/api/admin/batches?pageSize=100').then((d) => setBatches(d.items)).catch(() => {})
  }, [open])

  const toggleBatch = (id: string) => { const n = new Set(selectedBatches); if (n.has(id)) n.delete(id); else n.add(id); setSelectedBatches(n) }

  const submit = async () => {
    setSaving(true)
    try {
      const res = await api.post<{ test: { id: string } }>('/api/admin/tests', {
        title: form.title, description: form.description || undefined, instructions: form.instructions || undefined,
        durationMins: parseInt(form.durationMins), maxAttempts: parseInt(form.maxAttempts), maxQuestions: parseInt(form.maxQuestions),
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined, endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
        status: form.status, passingPct: form.passingPct ? parseInt(form.passingPct) : undefined,
        showAnswerKey: form.showAnswerKey, showResultImmediately: form.showResultImmediately,
        batchIds: Array.from(selectedBatches),
      })
      toast.success('Test created')
      onCreated(res.test.id)
    } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create New Test</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Instructions (shown to students)</Label><Textarea rows={2} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Duration (min) *</Label><Input type="number" value={form.durationMins} onChange={(e) => setForm({ ...form, durationMins: e.target.value })} /></div>
            <div><Label>Max Attempts *</Label><Input type="number" value={form.maxAttempts} onChange={(e) => setForm({ ...form, maxAttempts: e.target.value })} /></div>
            <div><Label>Max Questions *</Label><Input type="number" value={form.maxQuestions} onChange={(e) => setForm({ ...form, maxQuestions: e.target.value })} /></div>
            <div><Label>Pass %</Label><Input type="number" value={form.passingPct} onChange={(e) => setForm({ ...form, passingPct: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start At</Label><Input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></div>
            <div><Label>End At</Label><Input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="PUBLISHED">Published</SelectItem><SelectItem value="ARCHIVED">Archived</SelectItem></SelectContent></Select></div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.showAnswerKey} onCheckedChange={(v) => setForm({ ...form, showAnswerKey: !!v })} /> Show answer key after submission</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.showResultImmediately} onCheckedChange={(v) => setForm({ ...form, showResultImmediately: !!v })} /> Show result immediately</label>
          </div>
          <div>
            <Label>Assign to Batches</Label>
            <ScrollArea className="h-32 border rounded mt-1">
              {batches.length === 0 ? <div className="p-3 text-sm text-slate-500">No batches available</div> : batches.map((b) => (
                <label key={b.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer">
                  <Checkbox checked={selectedBatches.has(b.id)} onCheckedChange={() => toggleBatch(b.id)} /> <span className="text-sm">{b.name}</span>
                </label>
              ))}
            </ScrollArea>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving || !form.title} className="bg-blue-700 hover:bg-blue-800">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
