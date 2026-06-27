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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, ChevronDown, Trash2, Video as VideoIcon, BookOpen, FolderOpen, Edit3, Loader2 } from 'lucide-react'
import { statusColor, fmtDate } from '@/lib/format'
import { toast } from 'sonner'
import { extractYouTubeId } from '@/lib/youtube'

interface CourseDetail {
  id: string; title: string; slug: string; description?: string | null; thumbnail?: string | null; category?: string | null; status: string
  creator: { name: string; email: string }
  chapters: {
    id: string; title: string; order: number
    topics: { id: string; title: string; order: number; videos: { id: string; title: string; youtubeId: string; status: string; order: number; duration?: number | null }[] }[]
  }[]
  batches: { batch: { id: string; name: string; slug: string; status: string } }[]
}

export function AdminCourseDetail({ id }: { id: string }) {
  const { setView } = useApp()
  const toastAction = useToastAction()
  const [data, setData] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [chapterOpen, setChapterOpen] = useState(false)
  const [topicFor, setTopicFor] = useState<string | null>(null)
  const [videoFor, setVideoFor] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api.get<{ course: CourseDetail }>(`/api/admin/courses/${id}`).then((d) => setData(d.course)).catch((e) => toastAction.error(e)).finally(() => setLoading(false))
  }
  useEffect(load, [id])

  if (loading || !data) return <div className="text-center py-12 text-slate-500">Loading…</div>

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => setView({ name: 'admin/courses' })} className="mb-3"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Courses</Button>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {data.thumbnail ? <img src={data.thumbnail} alt="" className="w-full sm:w-48 h-32 rounded-lg object-cover" /> : <div className="w-full sm:w-48 h-32 rounded-lg bg-slate-100 flex items-center justify-center"><BookOpen className="w-10 h-10 text-slate-400" /></div>}
        <div className="flex-1">
          <div className="flex items-center gap-2"><h1 className="text-2xl font-bold">{data.title}</h1><Badge variant="outline" className={statusColor(data.status)}>{data.status}</Badge></div>
          <p className="text-sm text-slate-600 mt-1">{data.description || 'No description'}</p>
          <div className="text-xs text-slate-500 mt-2">Slug: <code>{data.slug}</code> · Category: {data.category || '—'} · Created by {data.creator.name}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Content Structure</h2>
        <Button size="sm" onClick={() => setChapterOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Chapter</Button>
      </div>

      {data.chapters.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-sm text-slate-500">No chapters yet. Add your first chapter to start building course content.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data.chapters.map((ch) => (
            <Collapsible key={ch.id}>
              <Card>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-3 hover:bg-slate-50 text-left">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{ch.title}</span>
                      <Badge variant="secondary" className="text-xs">{ch.topics.length} topics</Badge>
                    </div>
                    <div className="text-xs text-slate-500">Order #{ch.order}</div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 border-t">
                    <div className="flex justify-end gap-2 py-2">
                      <Button size="sm" variant="outline" onClick={() => setTopicFor(ch.id)}><Plus className="w-3 h-3 mr-1" /> Add Topic</Button>
                    </div>
                    {ch.topics.length === 0 ? <div className="text-center text-xs text-slate-400 py-3">No topics</div> : (
                      <div className="space-y-2 pb-2">
                        {ch.topics.map((t) => (
                          <div key={t.id} className="border rounded-lg p-2">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium">{t.title}</div>
                              <Button size="sm" variant="ghost" onClick={() => setVideoFor(t.id)}><Plus className="w-3 h-3 mr-1" /> Video</Button>
                            </div>
                            {t.videos.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {t.videos.map((v) => (
                                  <div key={v.id} className="flex items-center gap-2 p-2 rounded bg-slate-50">
                                    <VideoIcon className="w-4 h-4 text-rose-500 shrink-0" />
                                    <div className="flex-1 min-w-0"><div className="text-xs font-medium truncate">{v.title}</div><div className="text-[10px] text-slate-500">YouTube ID: {v.youtubeId}</div></div>
                                    <Badge variant="outline" className={`text-xs ${statusColor(v.status)}`}>{v.status}</Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      <CreateChapterDialog courseId={id} open={chapterOpen} onClose={() => setChapterOpen(false)} onCreated={load} />
      <CreateTopicDialog chapterId={topicFor} onClose={() => setTopicFor(null)} onCreated={load} />
      <CreateVideoDialog topicId={videoFor} onClose={() => setVideoFor(null)} onCreated={load} />
    </div>
  )
}

function CreateChapterDialog({ courseId, open, onClose, onCreated }: { courseId: string; open: boolean; onClose: () => void; onCreated: () => void }) {
  const toastAction = useToastAction()
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    setSaving(true)
    try { await api.post(`/api/admin/courses/${courseId}/chapters`, { title }); toast.success('Chapter added'); setTitle(''); onCreated(); onClose() }
    catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent><DialogHeader><DialogTitle>Add Chapter</DialogTitle></DialogHeader>
        <div><Label>Chapter Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving || !title} className="bg-blue-700 hover:bg-blue-800">Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateTopicDialog({ chapterId, onClose, onCreated }: { chapterId: string | null; onClose: () => void; onCreated: () => void }) {
  const toastAction = useToastAction()
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!chapterId) return
    setSaving(true)
    try { await api.post(`/api/admin/chapters/${chapterId}/topics`, { title }); toast.success('Topic added'); setTitle(''); onCreated(); onClose() }
    catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }
  return (
    <Dialog open={!!chapterId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent><DialogHeader><DialogTitle>Add Topic</DialogTitle></DialogHeader>
        <div><Label>Topic Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving || !title} className="bg-blue-700 hover:bg-blue-800">Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateVideoDialog({ topicId, onClose, onCreated }: { topicId: string | null; onClose: () => void; onCreated: () => void }) {
  const toastAction = useToastAction()
  const [form, setForm] = useState({ title: '', youtubeUrl: '', description: '', status: 'PUBLISHED' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (topicId) setForm({ title: '', youtubeUrl: '', description: '', status: 'PUBLISHED' }) }, [topicId])

  const submit = async () => {
    if (!topicId) return
    if (!extractYouTubeId(form.youtubeUrl)) {
      toast.error('Please enter a valid YouTube URL or 11-character video ID')
      return
    }
    setSaving(true)
    try {
      await api.post(`/api/admin/topics/${topicId}/videos`, {
        title: form.title, youtubeUrl: form.youtubeUrl, description: form.description || undefined, status: form.status,
      })
      toast.success('Video added')
      onCreated()
      onClose()
    } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }
  return (
    <Dialog open={!!topicId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent><DialogHeader><DialogTitle>Add Video Lecture</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Video Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>YouTube URL or ID *</Label><Input value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} placeholder="https://youtube.com/watch?v=…" /></div>
          <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="PUBLISHED">Published</SelectItem><SelectItem value="UNPUBLISHED">Unpublished</SelectItem></SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving || !form.title || !form.youtubeUrl} className="bg-blue-700 hover:bg-blue-800">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Add Video</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
