'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/stores/app-store'
import { api, ApiError } from '@/lib/api-client'
import { useToastAction } from '../../shared/admin-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ArrowLeft, Plus, Trash2, FileQuestion, Send, Loader2, Check, X } from 'lucide-react'
import { statusColor, fmtDateTime } from '@/lib/format'
import { toast } from 'sonner'

interface Question {
  id: string; text: string; explanation?: string | null; marks: number; order: number
  options: { id: string; text: string; isCorrect: boolean; order: number }[]
}
interface TestDetail {
  id: string; title: string; description?: string | null; instructions?: string | null; durationMins: number; maxAttempts: number; maxQuestions: number
  startAt?: string | null; endAt?: string | null; status: string; passingPct?: number | null
  showAnswerKey: boolean; showResultImmediately: boolean; publishedAt?: string | null
  questions: Question[]
  batches: { batch: { id: string; name: string; status: string } }[]
  _count: { attempts: number }
}

export function AdminTestDetail({ id }: { id: string }) {
  const { setView } = useApp()
  const toastAction = useToastAction()
  const [data, setData] = useState<TestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [qOpen, setQOpen] = useState(false)

  const load = () => {
    setLoading(true)
    api.get<{ test: TestDetail }>(`/api/admin/tests/${id}`).then((d) => setData(d.test)).catch((e) => toastAction.error(e)).finally(() => setLoading(false))
  }
  useEffect(load, [id])

  if (loading || !data) return <div className="text-center py-12 text-slate-500">Loading…</div>

  const publish = async () => {
    if (data.questions.length === 0) { toast.error('Add at least one question before publishing'); return }
    if (!confirm('Publish this test? Students will be able to attempt it.')) return
    try { await api.post(`/api/admin/tests/${id}/publish`); toast.success('Test published'); load() } catch (e) { toastAction.error(e) }
  }
  const deleteQ = async (qid: string) => {
    if (!confirm('Delete this question?')) return
    try { await api.del(`/api/admin/tests/${id}/questions/${qid}`); toast.success('Question deleted'); load() } catch (e) { toastAction.error(e) }
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => setView({ name: 'admin/tests' })} className="mb-3"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Tests</Button>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center shrink-0"><FileQuestion className="w-6 h-6 text-amber-600" /></div>
        <div className="flex-1">
          <div className="flex items-center gap-2"><h1 className="text-2xl font-bold">{data.title}</h1><Badge variant="outline" className={statusColor(data.status)}>{data.status}</Badge></div>
          <p className="text-sm text-slate-600 mt-1">{data.description || 'No description'}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
            <span>Duration: <strong>{data.durationMins}m</strong></span>
            <span>Max attempts: <strong>{data.maxAttempts}</strong></span>
            <span>Max questions: <strong>{data.maxQuestions}</strong></span>
            <span>Pass %: <strong>{data.passingPct ?? '—'}</strong></span>
            <span>Total attempts: <strong>{data._count.attempts}</strong></span>
            <span>Window: <strong>{data.startAt ? fmtDateTime(data.startAt) : 'open'} → {data.endAt ? fmtDateTime(data.endAt) : 'open'}</strong></span>
          </div>
        </div>
        {data.status === 'DRAFT' && <Button onClick={publish} className="bg-emerald-600 hover:bg-emerald-700"><Send className="w-4 h-4 mr-1" /> Publish</Button>}
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions ({data.questions.length}/{data.maxQuestions})</TabsTrigger>
          <TabsTrigger value="batches">Batches ({data.batches.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <Card><CardHeader><CardTitle className="text-base flex justify-between items-center">Questions<Button size="sm" onClick={() => setQOpen(true)} disabled={data.questions.length >= data.maxQuestions}><Plus className="w-4 h-4 mr-1" /> Add Question</Button></CardTitle></CardHeader>
            <CardContent>
              {data.questions.length === 0 ? <div className="text-center py-8 text-sm text-slate-500">No questions yet. Add your first MCQ question.</div> : (
                <div className="space-y-3">
                  {data.questions.map((q, i) => (
                    <div key={q.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-xs text-slate-500 mb-1">Q{i + 1} · {q.marks} mark(s)</div>
                          <div className="font-medium text-sm">{q.text}</div>
                          {q.explanation && <div className="text-xs text-slate-500 mt-1 italic">Explanation: {q.explanation}</div>}
                          <div className="mt-2 space-y-1">
                            {q.options.map((o, idx) => (
                              <div key={o.id} className={`flex items-center gap-2 text-sm p-1.5 rounded ${o.isCorrect ? 'bg-emerald-50 text-emerald-800' : ''}`}>
                                <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">{String.fromCharCode(65 + idx)}</span>
                                <span>{o.text}</span>
                                {o.isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteQ(q.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {data.questions.length >= data.maxQuestions && <div className="mt-3 text-xs text-amber-600">Maximum of {data.maxQuestions} questions reached.</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches">
          <Card><CardContent className="pt-4">
            {data.batches.length === 0 ? <div className="text-center py-8 text-sm text-slate-500">Not assigned to any batches.</div> : (
              <div className="space-y-1">
                {data.batches.map((bt) => (
                  <button key={bt.batch.id} onClick={() => setView({ name: 'admin/batches/detail', id: bt.batch.id })} className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-50 text-left">
                    <span className="text-sm font-medium">{bt.batch.name}</span>
                    <Badge variant="outline" className={statusColor(bt.batch.status)}>{bt.batch.status}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card><CardContent className="pt-4 text-sm space-y-2">
            <div>Show answer key after submission: <strong>{data.showAnswerKey ? 'Yes' : 'No'}</strong></div>
            <div>Show result immediately: <strong>{data.showResultImmediately ? 'Yes' : 'No'}</strong></div>
            <div>Instructions: <pre className="bg-slate-50 p-2 rounded text-xs whitespace-pre-wrap mt-1">{data.instructions || '—'}</pre></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <AddQuestionDialog testId={id} open={qOpen} onClose={() => setQOpen(false)} onAdded={load} />
    </div>
  )
}

function AddQuestionDialog({ testId, open, onClose, onAdded }: { testId: string; open: boolean; onClose: () => void; onAdded: () => void }) {
  const toastAction = useToastAction()
  const [text, setText] = useState('')
  const [explanation, setExplanation] = useState('')
  const [marks, setMarks] = useState('1')
  const [options, setOptions] = useState([{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }])
  const [saving, setSaving] = useState(false)

  const setOpt = (i: number, field: 'text' | 'isCorrect', v: string | boolean) => {
    const next = [...options]
    if (field === 'isCorrect') {
      // Single correct — uncheck others
      next.forEach((o, idx) => { o.isCorrect = idx === i ? !!v : false })
    } else {
      next[i] = { ...next[i], text: v as string }
    }
    setOptions(next)
  }
  const addOpt = () => setOptions([...options, { text: '', isCorrect: false }])
  const removeOpt = (i: number) => setOptions(options.filter((_, idx) => idx !== i))

  const submit = async () => {
    if (!text) { toast.error('Question text is required'); return }
    const validOpts = options.filter((o) => o.text.trim())
    if (validOpts.length < 2) { toast.error('At least 2 non-empty options required'); return }
    if (!validOpts.some((o) => o.isCorrect)) { toast.error('Mark exactly one option as correct'); return }
    setSaving(true)
    try {
      await api.post(`/api/admin/tests/${testId}/questions`, { text, explanation: explanation || undefined, marks: parseInt(marks) || 1, options: validOpts })
      toast.success('Question added')
      setText(''); setExplanation(''); setMarks('1'); setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }])
      onAdded(); onClose()
    } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Question Text *</Label><Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} /></div>
          <div><Label>Explanation (optional)</Label><Textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} /></div>
          <div><Label>Marks</Label><Input type="number" min="1" max="20" value={marks} onChange={(e) => setMarks(e.target.value)} className="w-24" /></div>
          <div>
            <Label>Options (mark the correct one) *</Label>
            <RadioGroup className="mt-2 space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <RadioGroupItem value={String(i)} checked={o.isCorrect} onClick={() => setOpt(i, 'isCorrect', true)} />
                  <Input value={o.text} onChange={(e) => setOpt(i, 'text', e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                  {o.isCorrect && <Badge className="bg-emerald-100 text-emerald-700">Correct</Badge>}
                  {options.length > 2 && <Button variant="ghost" size="icon" onClick={() => removeOpt(i)}><X className="w-4 h-4" /></Button>}
                </div>
              ))}
            </RadioGroup>
            {options.length < 6 && <Button variant="outline" size="sm" className="mt-2" onClick={addOpt}><Plus className="w-3 h-3 mr-1" /> Add Option</Button>}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving} className="bg-blue-700 hover:bg-blue-800">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Add Question</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
