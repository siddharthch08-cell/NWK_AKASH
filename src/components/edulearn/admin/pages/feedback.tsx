'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useToastAction, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Star, MessageSquare, Loader2 } from 'lucide-react'
import { fmtDateTime, statusColor } from '@/lib/format'
import { toast } from 'sonner'

interface Feedback { id: string; category: string; subject: string; message: string; rating?: number | null; status: string; notes?: string | null; createdAt: string; user: { name: string; email: string } }

export function AdminFeedback() {
  const toastAction = useToastAction()
  const [data, setData] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<Feedback | null>(null)

  const load = () => { setLoading(true); api.get<{ items: Feedback[] }>('/api/admin/feedback?pageSize=50').then((d) => setData(d.items)).catch((e) => toastAction.error(e)).finally(() => setLoading(false)) }
  useEffect(load, [])

  const update = async (id: string, status: string, notes?: string) => {
    try { await api.patch(`/api/admin/feedback/${id}`, { status, notes }); toast.success('Updated'); load() } catch (e) { toastAction.error(e) }
  }

  return (
    <div>
      <PageHeader title="Student Feedback" subtitle="Review feedback submitted by students" />
      {loading ? <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div> : data.length === 0 ? <EmptyState icon={MessageSquare} title="No feedback yet" message="Student feedback will appear here." /> : (
        <div className="space-y-2">
          {data.map((f) => (
            <Card key={f.id}><CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{f.subject}</h3>
                    <Badge variant="outline" className="text-xs">{f.category}</Badge>
                    <Badge variant="outline" className={statusColor(f.status)}>{f.status}</Badge>
                    {f.rating && <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < f.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />)}</div>}
                  </div>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{f.message}</p>
                  <div className="text-xs text-slate-400 mt-1">From {f.user.name} ({f.user.email}) · {fmtDateTime(f.createdAt)}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActive(f)}>View</Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <FeedbackDialog feedback={active} onClose={() => setActive(null)} onUpdate={update} />
    </div>
  )
}

function FeedbackDialog({ feedback, onClose, onUpdate }: { feedback: Feedback | null; onClose: () => void; onUpdate: (id: string, status: string, notes?: string) => void }) {
  const [status, setStatus] = useState('NEW')
  const [notes, setNotes] = useState('')
  useEffect(() => { if (feedback) { setStatus(feedback.status); setNotes(feedback.notes || '') } }, [feedback])
  if (!feedback) return null
  return (
    <Dialog open={!!feedback} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{feedback.subject}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm"><strong>From:</strong> {feedback.user.name} ({feedback.user.email})</div>
          {feedback.rating && <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-4 h-4 ${i < feedback.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />)}</div>}
          <div className="bg-slate-50 p-3 rounded text-sm whitespace-pre-wrap">{feedback.message}</div>
          <div><label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NEW">New</SelectItem><SelectItem value="REVIEWING">Reviewing</SelectItem><SelectItem value="RESOLVED">Resolved</SelectItem><SelectItem value="CLOSED">Closed</SelectItem></SelectContent></Select>
          </div>
          <div><label className="text-sm font-medium">Internal Notes</label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onUpdate(feedback.id, status, notes)} className="bg-blue-700 hover:bg-blue-800">Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
