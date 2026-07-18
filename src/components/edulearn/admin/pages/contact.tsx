'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { useToastAction, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MailOpen, Loader2, Mail, Phone, ChevronLeft, ChevronRight } from 'lucide-react'
import { fmtDateTime, statusColor } from '@/lib/format'
import { toast } from 'sonner'

interface Message { id: string; name: string; email: string; phone?: string | null; subject: string; message: string; status: string; notes?: string | null; createdAt: string }

export function AdminContact() {
  const toastAction = useToastAction()
  const [data, setData] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<Message | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = () => { setLoading(true); api.get<{ items: Message[]; totalPages: number }>(`/api/admin/contact?page=${page}&pageSize=20`).then((d) => { setData(d.items); setTotalPages(d.totalPages) }).catch((e) => toastAction.error(e)).finally(() => setLoading(false)) }
  useEffect(load, [page, toastAction])

  const update = async (id: string, status: string, notes?: string) => {
    try { await api.patch(`/api/admin/contact/${id}`, { status, notes }); toast.success('Updated'); load() } catch (e) { toastAction.error(e) }
  }

  return (
    <div>
      <PageHeader title="Contact Messages" subtitle="Messages submitted via the public contact form" />
      {loading ? <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div> : data.length === 0 ? <EmptyState icon={MailOpen} title="No messages yet" message="Public contact submissions will appear here." /> : (
        <div className="space-y-2">
          {data.map((m) => (
            <Card key={m.id}><CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{m.subject}</h3>
                    <Badge variant="outline" className={statusColor(m.status)}>{m.status}</Badge>
                  </div>
                  <div className="text-sm text-slate-600 mt-1 line-clamp-2">{m.message}</div>
                  <div className="text-xs text-slate-400 mt-1">From {m.name} · {m.email} · {fmtDateTime(m.createdAt)}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActive(m)}>View</Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      <MessageDialog message={active} onClose={() => setActive(null)} onUpdate={update} />
    </div>
  )
}

function MessageDialog({ message, onClose, onUpdate }: { message: Message | null; onClose: () => void; onUpdate: (id: string, status: string, notes?: string) => void }) {
  const [status, setStatus] = useState('NEW')
  const [notes, setNotes] = useState('')
  useEffect(() => { if (message) { setStatus(message.status); setNotes(message.notes || '') } }, [message])
  if (!message) return null
  return (
    <Dialog open={!!message} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{message.subject}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-slate-400" /> {message.email}</div>
          {message.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-slate-400" /> {message.phone}</div>}
          <div className="text-sm"><strong>From:</strong> {message.name}</div>
          <div className="bg-slate-50 p-3 rounded text-sm whitespace-pre-wrap">{message.message}</div>
          <div><label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NEW">New</SelectItem><SelectItem value="READ">Read</SelectItem><SelectItem value="REPLIED">Replied</SelectItem><SelectItem value="ARCHIVED">Archived</SelectItem></SelectContent></Select>
          </div>
          <div><label className="text-sm font-medium">Internal Notes</label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onUpdate(message.id, status, notes)} className="bg-blue-700 hover:bg-blue-800">Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
