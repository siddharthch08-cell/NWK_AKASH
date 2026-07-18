'use client'

import { ExternalImage } from '@/components/ui/external-image'
import { useApp } from '@/stores/app-store'
import { useApi, PageHeader } from '../../shared/admin-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { GraduationCap, BookOpen, Video, FileQuestion, Award, Clock, PlayCircle, Megaphone, ArrowRight, Calendar, Trophy } from 'lucide-react'
import { fmtDate, fmtDateTime, relativeTime } from '@/lib/format'

interface DashboardData {
  user: { id: string; name: string; email: string; status: string }
  stats: { enrolledBatches: number; activeTests: number; upcomingTests: number; videosCompleted: number; totalVideos: number; avgScore: number; bestScore: number; attemptsCount: number }
  enrollments: { id: string; name: string; slug: string; status: string; thumbnail?: string; courseCount: number; testCount: number; enrolledAt: string }[]
  courseProgress: { courseId: string; courseTitle: string; thumbnail?: string; batchName: string; totalVideos: number; completedVideos: number; progressPct: number }[]
  upcomingTests: { id: string; title: string; startAt: string; endAt: string; durationMins: number }[]
  recentResults: { id: string; attemptNumber: number; percentage: number; score: number; totalMarks: number; submittedAt: string; test: { id: string; title: string } }[]
  recentAnnouncements: { id: string; title: string; message: string; priority: string; pinned: boolean; publishAt: string }[]
  continueWatching: { videoId: string; title: string; thumbnail?: string; courseId: string; courseTitle: string; percent: number; position: number }[]
}

export function StudentDashboard() {
  const { setView, user } = useApp()
  const { data, loading } = useApi<DashboardData>('/api/student/dashboard')

  if (loading || !data) return <div className="text-center py-12 text-slate-500">Loading your dashboard…</div>

  const s = data.stats

  return (
    <div>
      <PageHeader title={`Welcome back, ${user?.name?.split(' ')[0] || 'Student'}!`} subtitle="Pick up where you left off and continue your learning journey." />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><div className="text-xs text-slate-500">Enrolled Batches</div><div className="text-2xl font-bold mt-1">{s.enrolledBatches}</div></div><GraduationCap className="w-8 h-8 text-blue-600" /></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><div className="text-xs text-slate-500">Videos Completed</div><div className="text-2xl font-bold mt-1">{s.videosCompleted}/{s.totalVideos}</div></div><Video className="w-8 h-8 text-violet-600" /></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><div className="text-xs text-slate-500">Active Tests</div><div className="text-2xl font-bold mt-1">{s.activeTests}</div></div><FileQuestion className="w-8 h-8 text-amber-600" /></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><div className="text-xs text-slate-500">Average Score</div><div className="text-2xl font-bold mt-1">{s.avgScore}%</div></div><Award className="w-8 h-8 text-teal-600" /></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Continue watching */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><PlayCircle className="w-5 h-5 text-rose-500" /> Continue Learning</CardTitle></CardHeader>
          <CardContent>
            {data.continueWatching.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">No videos in progress. Start a course to see your progress here.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.continueWatching.map((v) => (
                  <button key={v.videoId} onClick={() => setView({ name: 'student/videos', id: v.videoId })} className="flex gap-3 p-2 rounded-lg hover:bg-slate-50 text-left">
                    <div className="w-20 h-14 rounded bg-slate-100 overflow-hidden shrink-0 relative">
                      {v.thumbnail ? <ExternalImage src={v.thumbnail} alt="" className="w-full h-full object-cover" /> : <PlayCircle className="w-6 h-6 m-auto text-slate-400 mt-4" />}
                      <div className="absolute inset-0 flex items-center justify-center"><PlayCircle className="w-6 h-6 text-white drop-shadow" /></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{v.title}</div>
                      <div className="text-xs text-slate-500 truncate">{v.courseTitle}</div>
                      <Progress value={v.percent} className="h-1 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setView({ name: 'student/courses' })}>Browse all courses <ArrowRight className="w-3 h-3 ml-1" /></Button>
          </CardContent>
        </Card>

        {/* Upcoming tests */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="w-5 h-5 text-amber-600" /> Upcoming Tests</CardTitle></CardHeader>
          <CardContent>
            {data.upcomingTests.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">No upcoming tests scheduled.</div>
            ) : (
              <div className="space-y-2">
                {data.upcomingTests.map((t) => (
                  <button key={t.id} onClick={() => setView({ name: 'student/tests' })} className="w-full text-left p-2 rounded hover:bg-slate-50">
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDateTime(t.startAt)} · {t.durationMins}m</div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course progress */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-5 h-5 text-teal-600" /> Course Progress</CardTitle></CardHeader>
          <CardContent>
            {data.courseProgress.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">No courses assigned yet.</div>
            ) : (
              <div className="space-y-3">
                {data.courseProgress.map((c) => (
                  <button key={c.courseId} onClick={() => setView({ name: 'student/courses/detail', id: c.courseId })} className="w-full text-left p-3 rounded-lg border hover:shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-sm truncate">{c.courseTitle}</div>
                      <Badge variant="outline" className="text-xs">{c.progressPct}%</Badge>
                    </div>
                    <div className="text-xs text-slate-500 mb-2">{c.batchName} · {c.completedVideos}/{c.totalVideos} videos completed</div>
                    <Progress value={c.progressPct} className="h-1.5" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="w-5 h-5 text-amber-600" /> Announcements</CardTitle></CardHeader>
          <CardContent>
            {data.recentAnnouncements.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">No announcements.</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto scroll-thin">
                {data.recentAnnouncements.map((a) => (
                  <div key={a.id} className="p-2 rounded-lg border">
                    <div className="text-sm font-medium">{a.title}</div>
                    <div className="text-xs text-slate-500 line-clamp-2 mt-1">{a.message}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{relativeTime(a.publishAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent results */}
      {data.recentResults.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-600" /> Recent Results</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentResults.slice(0, 5).map((r) => (
                <button key={r.id} onClick={() => setView({ name: 'student/results/detail', id: r.id })} className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-50 text-left">
                  <div><div className="text-sm font-medium">{r.test.title}</div><div className="text-xs text-slate-500">Attempt #{r.attemptNumber} · {fmtDate(r.submittedAt)}</div></div>
                  <Badge variant="outline" className={r.percentage >= 50 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}>{r.percentage}%</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
