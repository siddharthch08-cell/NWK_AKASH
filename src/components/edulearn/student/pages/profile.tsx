'use client'

import { useEffect, useState, useCallback } from 'react'
import { useApp } from '@/stores/app-store'
import { api } from '@/lib/api-client'
import { useToastAction, PageHeader } from '../../shared/admin-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Save, KeyRound, LogOut, Calendar, GraduationCap } from 'lucide-react'
import { fmtDateTime, statusColor } from '@/lib/format'
import { toast } from 'sonner'

interface StudentProfileData {
  id: string
  email: string
  name: string
  phone: string | null
  photo: string | null
  status: string
  createdAt: string
  lastLoginAt: string | null
  _count: { enrollments: number; testAttempts: number; videoProgress: number }
  enrollments: Array<{ batch: { id: string; name: string; slug: string; status: string } }>
}

type UpdatedProfile = Pick<StudentProfileData, 'id' | 'email' | 'name' | 'phone' | 'photo' | 'status'>

export function StudentProfile() {
  const { user, logout, setUser } = useApp()
  const toastAction = useToastAction()
  const [data, setData] = useState<StudentProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', phone: '', photo: '' })
  const [saving, setSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwSaving, setPwSaving] = useState(false)

  const load = useCallback(() => { setLoading(true); api.get<{ user: StudentProfileData }>('/api/student/profile').then((d) => { setData(d.user); setForm({ name: d.user.name, phone: d.user.phone || '', photo: d.user.photo || '' }) }).catch((e) => toastAction.error(e)).finally(() => setLoading(false)) }, [toastAction])
  useEffect(() => { load() }, [load])

  const saveProfile = async () => {
    setSaving(true)
    try {
      const res = await api.patch<{ user: UpdatedProfile }>('/api/student/profile', form)
      toast.success('Profile updated')
      // Merge updated user into shared store (don't reset view)
      if (user) {
        setUser({ ...user, name: res.user.name, phone: res.user.phone, photo: res.user.photo })
      }
      load()
    } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }
  const changePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return }
    setPwSaving(true)
    try { await api.post('/api/auth/change-password', pwForm); toast.success('Password changed. Please log in again.'); logout() } catch (e) { toastAction.error(e) } finally { setPwSaving(false) }
  }

  if (loading || !data) return <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>

  return (
    <div>
      <PageHeader title="Profile & Settings" subtitle="Manage your account details and security" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">{data.name.charAt(0)}</div>
            <h2 className="text-lg font-bold">{data.name}</h2>
            <p className="text-sm text-slate-500">{data.email}</p>
            <Badge variant="outline" className={`mt-2 ${statusColor(data.status)}`}>{data.status}</Badge>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div><div className="font-bold">{data._count?.enrollments ?? 0}</div><div className="text-xs text-slate-500">Batches</div></div>
              <div><div className="font-bold">{data._count?.testAttempts ?? 0}</div><div className="text-xs text-slate-500">Tests</div></div>
              <div><div className="font-bold">{data._count?.videoProgress ?? 0}</div><div className="text-xs text-slate-500">Videos</div></div>
            </div>
            <div className="mt-4 pt-4 border-t space-y-1 text-xs text-left text-slate-500">
              <div className="flex items-center gap-2"><Calendar className="w-3 h-3" /> Registered: {fmtDateTime(data.createdAt)}</div>
              <div className="flex items-center gap-2"><Calendar className="w-3 h-3" /> Last login: {data.lastLoginAt ? fmtDateTime(data.lastLoginAt) : 'Never'}</div>
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full text-rose-600 hover:text-rose-700" onClick={logout}><LogOut className="w-4 h-4 mr-1" /> Logout</Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="profile">
            <TabsList><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="password">Password</TabsTrigger><TabsTrigger value="batches">Batches</TabsTrigger></TabsList>

            <TabsContent value="profile">
              <Card><CardHeader><CardTitle className="text-base">Edit Profile</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label>Email (cannot be changed)</Label><Input value={data.email} disabled /></div>
                  <div><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label>Photo URL</Label><Input value={form.photo} onChange={(e) => setForm({ ...form, photo: e.target.value })} placeholder="https://…" /></div>
                  <Button onClick={saveProfile} disabled={saving} className="bg-blue-700 hover:bg-blue-800"><Save className="w-4 h-4 mr-1" /> {saving ? 'Saving…' : 'Save Changes'}</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="password">
              <Card><CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label>Current Password</Label><Input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} /></div>
                  <div><Label>New Password</Label><Input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} /><p className="text-xs text-slate-500 mt-1">Min 8 chars, must include uppercase, lowercase, and a number.</p></div>
                  <div><Label>Confirm New Password</Label><Input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} /></div>
                  <Button onClick={changePassword} disabled={pwSaving} className="bg-blue-700 hover:bg-blue-800"><KeyRound className="w-4 h-4 mr-1" /> {pwSaving ? 'Changing…' : 'Change Password'}</Button>
                  <p className="text-xs text-slate-500">All other devices will be logged out after password change.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="batches">
              <Card><CardHeader><CardTitle className="text-base">Enrolled Batches</CardTitle></CardHeader>
                <CardContent>
                  {data.enrollments.length === 0 ? <div className="text-sm text-slate-500">Not enrolled in any batches.</div> : (
                    <div className="space-y-2">
                      {data.enrollments.map((e) => (
                        <div key={e.batch.id} className="flex items-center justify-between p-2 rounded border">
                          <div className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-blue-600" /><div><div className="text-sm font-medium">{e.batch.name}</div><div className="text-xs text-slate-500">{e.batch.slug}</div></div></div>
                          <Badge variant="outline" className={statusColor(e.batch.status)}>{e.batch.status}</Badge>
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
