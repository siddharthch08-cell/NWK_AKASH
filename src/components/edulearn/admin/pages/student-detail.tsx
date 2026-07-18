'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/stores/app-store'
import { api } from '@/lib/api-client'
import { useToastAction, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Check, Ban, RotateCcw, Mail, Phone, Calendar, Clock, BookOpen, FileQuestion, Save } from 'lucide-react'
import { fmtDateTime, statusColor, relativeTime } from '@/lib/format'

interface StudentDetail {
  id: string; name: string; email: string; phone?: string | null; photo?: string | null
  status: string; rejectionReason?: string | null; createdAt: string; lastLoginAt?: string | null
  enrollments: { batch: { id: string; name: string; slug: string; status: string }; enrolledAt: string }[]
  testAttempts: { id: string; attemptNumber: number; status: string; percentage: number; score: number; totalMarks: number; startedAt: string; test: { id: string; title: string } }[]
  videoProgress: { id: string; percent: number; completed: boolean; lastWatchedAt: string; video: { id: string; title: string } }[]
  _count: { testAttempts: number; videoProgress: number; enrollments: number }
}

export function AdminStudentDetail({ id }: { id: string }) {
  const { setView } = useApp()
  const toastAction = useToastAction()
  const [data, setData] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })

  const load = () => {
    setLoading(true)
    api.get<{ student: StudentDetail }>(`/api/admin/students/${id}`)
      .then((d) => { setData(d.student); setForm({ name: d.student.name, phone: d.student.phone || '' }) })
      .catch((e) => toastAction.error(e))
      .finally(() => setLoading(false))
  }
  useEffect(load, [id, toastAction])

  const action = async (type: 'approve' | 'reject' | 'block' | 'unblock' | 'activate' | 'deactivate', body?: { reason?: string }) => {
    try {
      await api.post(`/api/admin/students/${id}/${type}`, body || {})
      toastAction.success(`Student ${type}d`)
      load()
    } catch (e) { toastAction.error(e) }
  }

  const save = async () => {
    try {
      await api.patch(`/api/admin/students/${id}`, { name: form.name, phone: form.phone })
      toastAction.success('Profile updated')
      setEditing(false)
      load()
    } catch (e) { toastAction.error(e) }
  }

  if (loading || !data) return <div className="text-center py-12 text-slate-500">Loading…</div>

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => setView({ name: 'admin/students' })} className="mb-3"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Students</Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 text-center">
            <Avatar className="w-20 h-20 mx-auto mb-3"><AvatarFallback className="bg-gradient-to-br from-blue-500 to-teal-400 text-white text-2xl">{data.name.charAt(0)}</AvatarFallback></Avatar>
            <h2 className="text-xl font-bold">{data.name}</h2>
            <p className="text-sm text-slate-500">{data.email}</p>
            <Badge variant="outline" className={`mt-2 ${statusColor(data.status)}`}>{data.status}</Badge>
            {data.rejectionReason && <p className="text-xs text-rose-600 mt-2">Reason: {data.rejectionReason}</p>}
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div><div className="font-bold">{data._count.enrollments}</div><div className="text-xs text-slate-500">Batches</div></div>
              <div><div className="font-bold">{data._count.testAttempts}</div><div className="text-xs text-slate-500">Tests</div></div>
              <div><div className="font-bold">{data._count.videoProgress}</div><div className="text-xs text-slate-500">Videos</div></div>
            </div>
            <div className="mt-4 pt-4 border-t space-y-2">
              <Button
                size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={data.status === 'ACTIVE' || data.status === 'APPROVED'}
                onClick={() => action('approve')}
              ><Check className="w-4 h-4 mr-1" /> Approve</Button>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" disabled={data.status === 'BLOCKED'} onClick={() => action('block')}><Ban className="w-4 h-4 mr-1" /> Block</Button>
                <Button size="sm" variant="outline" disabled={data.status !== 'BLOCKED'} onClick={() => action('unblock')}><RotateCcw className="w-4 h-4 mr-1" /> Unblock</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="batches">Batches</TabsTrigger>
              <TabsTrigger value="tests">Tests</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              <Card>
                <CardHeader><CardTitle className="text-base flex justify-between items-center">Profile Details{!editing && <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {editing ? (
                    <>
                      <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                      <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                      <Button size="sm" onClick={save}><Save className="w-4 h-4 mr-1" /> Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                    </>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> {data.email}</div>
                      <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {data.phone || '—'}</div>
                      <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> Registered: {fmtDateTime(data.createdAt)}</div>
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> Last login: {data.lastLoginAt ? fmtDateTime(data.lastLoginAt) : 'Never'}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="batches">
              <Card><CardHeader><CardTitle className="text-base">Enrolled Batches</CardTitle></CardHeader>
                <CardContent>
                  {data.enrollments.length === 0 ? <EmptyState icon={BookOpen} title="No batches assigned" message="This student is not enrolled in any batches yet." /> : (
                    <div className="space-y-2">
                      {data.enrollments.map((e) => (
                        <button key={e.batch.id} onClick={() => setView({ name: 'admin/batches/detail', id: e.batch.id })} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 text-left">
                          <div><div className="font-medium">{e.batch.name}</div><div className="text-xs text-slate-500">Enrolled {relativeTime(e.enrolledAt)}</div></div>
                          <Badge variant="outline" className={statusColor(e.batch.status)}>{e.batch.status}</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="tests">
              <Card><CardHeader><CardTitle className="text-base">Test Attempts</CardTitle></CardHeader>
                <CardContent>
                  {data.testAttempts.length === 0 ? <EmptyState icon={FileQuestion} title="No test attempts" message="This student has not attempted any tests yet." /> : (
                    <div className="space-y-2">
                      {data.testAttempts.map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div><div className="font-medium text-sm">{a.test.title}</div><div className="text-xs text-slate-500">Attempt #{a.attemptNumber} · {fmtDateTime(a.startedAt)}</div></div>
                          <div className="text-right"><div className="font-bold">{a.percentage}%</div><Badge variant="outline" className={statusColor(a.status)}>{a.status}</Badge></div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="videos">
              <Card><CardHeader><CardTitle className="text-base">Video Progress</CardTitle></CardHeader>
                <CardContent>
                  {data.videoProgress.length === 0 ? <EmptyState icon={BookOpen} title="No video progress" message="This student has not watched any videos yet." /> : (
                    <div className="space-y-2">
                      {data.videoProgress.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div><div className="font-medium text-sm">{p.video.title}</div><div className="text-xs text-slate-500">Last watched {relativeTime(p.lastWatchedAt)}</div></div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{p.percent}%</div>
                            {p.completed ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Completed</Badge> : <Badge variant="outline">In progress</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
