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
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Plus, ChevronDown, Trash2, Video as VideoIcon, BookOpen, FolderOpen, Edit3, Loader2, GraduationCap, ChevronRight } from 'lucide-react'
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

  // --- Delete handlers with child-count warnings ---
  const deleteChapter = async (chapterId: string, title: string, topicCount: number) => {
    const msg = topicCount > 0
      ? `Delete chapter "${title}"?\n\nThis will permanently delete ${topicCount} topic(s) and ALL videos inside them. This cannot be undone.`
      : `Delete chapter "${title}"?\n\nThis action cannot be undone.`
    if (!confirm(msg)) return
    try {
      await api.del(`/api/admin/chapters/${chapterId}`)
      toast.success('Chapter deleted')
      load()
    } catch (e) { toastAction.error(e) }
  }

  const deleteTopic = async (topicId: string, title: string, videoCount: number) => {
    const msg = videoCount > 0
      ? `Delete topic "${title}"?\n\nThis will permanently delete ${videoCount} video(s) inside it. This cannot be undone.`
      : `Delete topic "${title}"?\n\nThis action cannot be undone.`
    if (!confirm(msg)) return
    try {
      await api.del(`/api/admin/topics/${topicId}`)
      toast.success('Topic deleted')
      load()
    } catch (e) { toastAction.error(e) }
  }

  const deleteVideo = async (videoId: string, title: string) => {
    if (!confirm(`Delete video "${title}"?\n\nThis will permanently remove it from the course. Student progress for this video will also be removed. This cannot be undone.`)) return
    try {
      await api.del(`/api/admin/videos/${videoId}`)
      toast.success('Video deleted')
      load()
    } catch (e) { toastAction.error(e) }
  }

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

      {/* Active Batch Availability — full sync management */}
      <ActiveBatchAvailability courseId={id} assignedBatches={data.batches} onChanged={load} />

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
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-slate-500">Order #{ch.order}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        onClick={(e) => { e.stopPropagation(); deleteChapter(ch.id, ch.title, ch.topics.length) }}
                        title={`Delete chapter "${ch.title}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium">{t.title}</div>
                                {t.videos.length > 0 && <Badge variant="secondary" className="text-xs">{t.videos.length} videos</Badge>}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => setVideoFor(t.id)}><Plus className="w-3 h-3 mr-1" /> Video</Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                  onClick={() => deleteTopic(t.id, t.title, t.videos.length)}
                                  title={`Delete topic "${t.title}"`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                            {t.videos.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {t.videos.map((v) => (
                                  <div key={v.id} className="flex items-center gap-2 p-2 rounded bg-slate-50">
                                    <VideoIcon className="w-4 h-4 text-rose-500 shrink-0" />
                                    <div className="flex-1 min-w-0"><div className="text-xs font-medium truncate">{v.title}</div><div className="text-[10px] text-slate-500">YouTube ID: {v.youtubeId}</div></div>
                                    <Badge variant="outline" className={`text-xs ${statusColor(v.status)}`}>{v.status}</Badge>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-100"
                                      onClick={() => deleteVideo(v.id, v.title)}
                                      title={`Delete video "${v.title}"`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
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

// ---------------------------------------------------------------------------
// ActiveBatchAvailability — shows all ACTIVE batches with toggle assignment
// ---------------------------------------------------------------------------
function ActiveBatchAvailability({ courseId, assignedBatches, onChanged }: { courseId: string; assignedBatches: { batch: { id: string; name: string; status: string } }[]; onChanged: () => void }) {
  const toastAction = useToastAction()
  const { setView } = useApp()
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const load = () => {
    setLoading(true)
    api.get<{ batches: any[] }>(`/api/admin/courses/${courseId}/batches`).then((d) => {
      setBatches(d.batches)
      setHasChanges(false)
    }).catch((e) => toastAction.error(e)).finally(() => setLoading(false))
  }
  useEffect(load, [courseId])

  const toggle = (batchId: string) => {
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, assigned: !b.assigned } : b))
    setHasChanges(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const batchIds = batches.filter((b) => b.assigned).map((b) => b.id)
      const res = await api.put<{ added: number; removed: number }>(`/api/admin/courses/${courseId}/batches`, { batchIds })
      toast.success(`Synced (+${res.added} -${res.removed})`)
      setHasChanges(false)
      onChanged()
    } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }

  const assignedCount = batches.filter((b) => b.assigned).length

  return (
    <Card className="mb-6 border-2">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-blue-700" /> Active Batch Availability ({assignedCount}/{batches.length})</span>
          {hasChanges && <Button size="sm" onClick={save} disabled={saving} className="bg-blue-700 hover:bg-blue-800">{saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}Save Assignments</Button>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
        ) : batches.length === 0 ? (
          <div className="text-center py-4 text-sm text-slate-500">No active batches available. <button onClick={() => setView({ name: 'admin/batches' })} className="text-blue-700 hover:underline">Create one</button> first.</div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-slate-500 mb-2">Toggle which active batches receive this course. Content is shared across all assigned batches.</p>
            {batches.map((b) => (
              <div key={b.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${b.assigned ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
                <Checkbox checked={b.assigned} onCheckedChange={() => toggle(b.id)} />
                <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{b.name}</div><div className="text-xs text-slate-500 truncate">{b.description?.slice(0, 80) || b.slug}</div></div>
                <div className="text-xs text-slate-500 shrink-0">{b.enrolledCount} students</div>
                <Badge variant="outline" className={`text-xs shrink-0 ${b.assigned ? 'bg-emerald-100 text-emerald-700' : ''}`}>{b.assigned ? 'Assigned' : 'Unassigned'}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
