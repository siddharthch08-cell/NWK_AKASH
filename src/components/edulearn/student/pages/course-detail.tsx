'use client'

import { useApp } from '@/stores/app-store'
import { useApi } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ArrowLeft, BookOpen, ChevronDown, PlayCircle, CheckCircle2 } from 'lucide-react'
import { relativeTime } from '@/lib/format'

export function StudentCourseDetail({ id }: { id: string }) {
  const { setView } = useApp()
  const { data, loading } = useApi<{ course: any }>(`/api/student/courses/${id}`)

  if (loading || !data) return <div className="text-center py-12 text-slate-500">Loading…</div>
  const c = data.course

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => setView({ name: 'student/courses' })} className="mb-3"><ArrowLeft className="w-4 h-4 mr-1" /> Back to My Courses</Button>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {c.thumbnail ? <img src={c.thumbnail} alt="" className="w-full sm:w-48 h-32 rounded-lg object-cover" /> : <div className="w-full sm:w-48 h-32 rounded-lg bg-slate-100 flex items-center justify-center"><BookOpen className="w-10 h-10 text-slate-400" /></div>}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{c.title}</h1>
          <p className="text-sm text-slate-600 mt-1">{c.description || 'No description'}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Course Content</h2>
      {c.chapters.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-slate-500">No content published yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {c.chapters.map((ch: any) => (
            <Collapsible key={ch.id}>
              <Card>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-3 hover:bg-slate-50 text-left">
                    <div className="flex items-center gap-2"><ChevronDown className="w-4 h-4 text-slate-400" /><span className="font-medium">{ch.title}</span><Badge variant="secondary" className="text-xs">{ch.topics.length} topics</Badge></div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 border-t">
                    <div className="space-y-2 py-2">
                      {ch.topics.map((t: any) => (
                        <div key={t.id} className="border rounded-lg p-2">
                          <div className="text-sm font-medium mb-1">{t.title}</div>
                          <div className="space-y-1">
                            {t.videos.map((v: any) => {
                              const progress = v.progress?.[0]
                              const completed = progress?.completed
                              return (
                                <button key={v.id} onClick={() => setView({ name: 'student/videos', id: v.id })} className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-left">
                                  {completed ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <PlayCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                                  <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{v.title}</div>{progress && <div className="text-xs text-slate-500">{progress.percent}% · last watched {relativeTime(progress.lastWatchedAt)}</div>}</div>
                                  {v.duration && <span className="text-xs text-slate-400">{Math.floor(v.duration / 60)}m</span>}
                                </button>
                              )
                            })}
                            {t.videos.length === 0 && <div className="text-xs text-slate-400 px-2 py-1">No videos in this topic</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  )
}
