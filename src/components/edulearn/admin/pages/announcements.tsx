'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useToastAction, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Megaphone, Loader2, Pin } from 'lucide-react'
import { fmtDateTime, statusColor, relativeTime } from '@/lib/format'
import { toast } from 'sonner'

interface Announcement {
  id: string; title: string; message: string; audience: string; priority: string; pinned: boolean; status: string; publishAt: string; expireAt?: string | null
  creator: { name: string }
  batches?: { batch: { id: string; name: string } }[]
}

export function AdminAnnouncements() {
  const toastAction = useToastAction()
  const [data, setData] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const load = () => {
    setLoading(true)
    api.get<{ items: Announcement[] }>('/api/admin/announcements?pageSize=50').then((d) => setData(d.items)).catch((e) => toastAction.error(e)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Publish announcements for public, all students, or specific batches"
        actions={<Button size="sm" onClick={() => setCreateOpen(true)} className="bg-blue-700 hover:bg-blue-800"><Plus className="w-4 h-4 mr-1" /> New Announcement</Button>} />

      {loading ? <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div> : data.length === 0 ? <EmptyState icon={Megaphone} title="No announcements yet" message="Create your first announcement to communicate with students." /> : (
        <div className="space-y-3">
          {data.map((a) => (
            <Card key={a.id} className={a.pinned ? 'border-amber-300' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.pinned && <Pin className="w-4 h-4 text-amber-600" />}
                      <h3 className="font-semibold">{a.title}</h3>
                      <Badge variant="outline" className={statusColor(a.status)}>{a.status}</Badge>
                      <Badge variant="outline" className="text-xs">{a.audience}</Badge>
                      <Badge variant={a.priority === 'CRITICAL' ? 'destructive' : a.priority === 'HIGH' ? 'default' : 'secondary'} className={a.priority === 'HIGH' ? 'bg-orange-500' : ''}>{a.priority}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{a.message}</p>
                    {a.batches && a.batches.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.batches.map((b) => <Badge key={b.batch.id} variant="outline" className="text-xs">{b.batch.name}</Badge>)}
                      </div>
                    )}
                    <div className="text-xs text-slate-400 mt-2">By {a.creator.name} · {fmtDateTime(a.publishAt)}{a.expireAt ? ` · expires ${fmtDateTime(a.expireAt)}` : ''}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateAnnouncementDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load() }} />
    </div>
  )
}

function CreateAnnouncementDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const toastAction = useToastAction()
  const [form, setForm] = useState({ title: '', message: '', audience: 'PUBLIC', priority: 'NORMAL', pinned: false, status: 'PUBLISHED', expireAt: '' })
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([])
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) api.get<{ items: any[] }>('/api/admin/batches?pageSize=100').then((d) => setBatches(d.items)).catch(() => {}) }, [open])

  const toggle = (id: string) => { const n = new Set(selectedBatches); if (n.has(id)) n.delete(id); else n.add(id); setSelectedBatches(n) }

  const submit = async () => {
    if (form.audience === 'BATCH' && selectedBatches.size === 0) { toast.error('Select at least one batch for BATCH audience'); return }
    setSaving(true)
    try {
      await api.post('/api/admin/announcements', {
        ...form, expireAt: form.expireAt ? new Date(form.expireAt).toISOString() : undefined, batchIds: Array.from(selectedBatches),
      })
      toast.success('Announcement created')
      setForm({ title: '', message: '', audience: 'PUBLIC', priority: 'NORMAL', pinned: false, status: 'PUBLISHED', expireAt: '' })
      setSelectedBatches(new Set())
      onCreated()
    } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Message *</Label><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Audience</Label><Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PUBLIC">Public</SelectItem><SelectItem value="ALL_STUDENTS">All Students</SelectItem><SelectItem value="BATCH">Specific Batches</SelectItem></SelectContent></Select></div>
            <div><Label>Priority</Label><Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="LOW">Low</SelectItem><SelectItem value="NORMAL">Normal</SelectItem><SelectItem value="HIGH">High</SelectItem><SelectItem value="CRITICAL">Critical</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="PUBLISHED">Published</SelectItem></SelectContent></Select></div>
            <div><Label>Expire At (optional)</Label><Input type="datetime-local" value={form.expireAt} onChange={(e) => setForm({ ...form, expireAt: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: !!v })} /> Pin to top</label>
          {form.audience === 'BATCH' && (
            <div><Label>Select Batches</Label>
              <ScrollArea className="h-32 border rounded mt-1">
                {batches.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer">
                    <Checkbox checked={selectedBatches.has(b.id)} onCheckedChange={() => toggle(b.id)} /> <span className="text-sm">{b.name}</span>
                  </label>
                ))}
              </ScrollArea>
            </div>
          )}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving || !form.title || !form.message} className="bg-blue-700 hover:bg-blue-800">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Publish</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
