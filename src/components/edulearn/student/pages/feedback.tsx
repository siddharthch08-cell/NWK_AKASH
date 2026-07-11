'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { useToastAction, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star, MessageSquare, Loader2, Send } from 'lucide-react'
import { fmtDateTime, statusColor } from '@/lib/format'
import { toast } from 'sonner'

export function StudentFeedback() {
  const toastAction = useToastAction()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ category: 'GENERAL', subject: '', message: '', rating: 0 })

  const load = useCallback(() => { setLoading(true); api.get<{ items: any[] }>('/api/student/feedback?pageSize=50').then((d) => setData(d.items)).catch((e) => toastAction.error(e)).finally(() => setLoading(false)) }, [toastAction])
  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!form.subject || !form.message) { toastAction.error(new Error('Subject and message are required')); return }
    setSubmitting(true)
    try { await api.post('/api/student/feedback', form); toast.success('Feedback submitted'); setForm({ category: 'GENERAL', subject: '', message: '', rating: 0 }); load() }
    catch (e) { toastAction.error(e) } finally { setSubmitting(false) }
  }

  return (
    <div>
      <PageHeader title="Feedback" subtitle="Share your thoughts, report issues, or suggest improvements" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="text-base">Submit Feedback</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Category</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="COURSE_CONTENT">Course Content</SelectItem><SelectItem value="VIDEO_ISSUE">Video Issue</SelectItem><SelectItem value="TEST_ISSUE">Test Issue</SelectItem><SelectItem value="TECHNICAL">Technical Problem</SelectItem><SelectItem value="GENERAL">General Suggestion</SelectItem></SelectContent></Select></div>
            <div><Label>Subject *</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div><Label>Message *</Label><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <div><Label>Rating (optional)</Label><div className="flex gap-1 mt-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setForm({ ...form, rating: form.rating === n ? 0 : n })} aria-label={`${n} star`}><Star className={`w-6 h-6 ${n <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} /></button>)}</div></div>
            <Button onClick={submit} disabled={submitting} className="bg-blue-700 hover:bg-blue-800">{submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Submit Feedback</Button>
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="text-base">Your Past Feedback</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div> : data.length === 0 ? <EmptyState icon={MessageSquare} title="No feedback yet" message="Your submitted feedback will appear here." /> : (
              <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
                {data.map((f) => (
                  <div key={f.id} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 flex-wrap"><Badge variant="outline" className="text-xs">{f.category}</Badge><Badge variant="outline" className={statusColor(f.status)}>{f.status}</Badge>{f.rating && <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />)}</div>}</div>
                    <div className="font-medium text-sm mt-1">{f.subject}</div>
                    <div className="text-xs text-slate-600 mt-1 line-clamp-2">{f.message}</div>
                    <div className="text-xs text-slate-400 mt-1">{fmtDateTime(f.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
