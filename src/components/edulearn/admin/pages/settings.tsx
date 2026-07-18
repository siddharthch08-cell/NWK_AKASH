'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { useToastAction, PageHeader } from '../../shared/admin-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import type { InstituteSetting } from '@prisma/client'

type SettingsData = Omit<InstituteSetting, 'updatedAt'> & { updatedAt: string }

export function AdminSettings() {
  const toastAction = useToastAction()
  const [data, setData] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = () => { setLoading(true); api.get<{ settings: SettingsData }>('/api/admin/settings').then((d) => setData(d.settings)).catch((e) => toastAction.error(e)).finally(() => setLoading(false)) }
  useEffect(load, [toastAction])

  const save = async () => {
    if (!data) return
    setSaving(true)
    try { await api.patch('/api/admin/settings', data); toast.success('Settings saved') } catch (e) { toastAction.error(e) } finally { setSaving(false) }
  }
  const set = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setData((current) => current ? { ...current, [key]: value } : current)
  }

  if (loading || !data) return <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>

  return (
    <div>
      <PageHeader title="Institute Settings" subtitle="Configure public website content, branding, and platform behavior"
        actions={<Button onClick={save} disabled={saving} className="bg-blue-700 hover:bg-blue-800"><Save className="w-4 h-4 mr-1" /> {saving ? 'Saving…' : 'Save Changes'}</Button>} />
      <Tabs defaultValue="branding">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
        </TabsList>

        <TabsContent value="branding"><Card><CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader><CardContent className="space-y-3">
          <div><Label>Institute Name *</Label><Input value={data.instituteName} onChange={(e) => set('instituteName', e.target.value)} /></div>
          <div><Label>Tagline</Label><Input value={data.tagline} onChange={(e) => set('tagline', e.target.value)} /></div>
          <div><Label>Logo URL</Label><Input value={data.logo || ''} onChange={(e) => set('logo', e.target.value)} /></div>
          <div><Label>Favicon URL</Label><Input value={data.favicon || ''} onChange={(e) => set('favicon', e.target.value)} /></div>
        </CardContent></Card></TabsContent>

        <TabsContent value="hero"><Card><CardHeader><CardTitle className="text-base">Hero Section</CardTitle></CardHeader><CardContent className="space-y-3">
          <div><Label>Hero Title</Label><Input value={data.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} /></div>
          <div><Label>Hero Subtitle</Label><Textarea rows={3} value={data.heroSubtitle} onChange={(e) => set('heroSubtitle', e.target.value)} /></div>
          <div><Label>Hero Image URL</Label><Input value={data.heroImage || ''} onChange={(e) => set('heroImage', e.target.value)} /></div>
        </CardContent></Card></TabsContent>

        <TabsContent value="about"><Card><CardHeader><CardTitle className="text-base">About Section</CardTitle></CardHeader><CardContent className="space-y-3">
          <div><Label>Mission</Label><Textarea rows={3} value={data.aboutMission || ''} onChange={(e) => set('aboutMission', e.target.value)} /></div>
          <div><Label>Vision</Label><Textarea rows={3} value={data.aboutVision || ''} onChange={(e) => set('aboutVision', e.target.value)} /></div>
          <div><Label>About Text</Label><Textarea rows={5} value={data.aboutText || ''} onChange={(e) => set('aboutText', e.target.value)} /></div>
        </CardContent></Card></TabsContent>

        <TabsContent value="contact"><Card><CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader><CardContent className="space-y-3">
          <div><Label>Primary Email</Label><Input value={data.primaryEmail || ''} onChange={(e) => set('primaryEmail', e.target.value)} /></div>
          <div><Label>Primary Phone</Label><Input value={data.primaryPhone || ''} onChange={(e) => set('primaryPhone', e.target.value)} /></div>
          <div><Label>Address</Label><Textarea rows={2} value={data.address || ''} onChange={(e) => set('address', e.target.value)} /></div>
          <div><Label>Google Maps Embed URL</Label><Textarea rows={2} value={data.mapsEmbedUrl || ''} onChange={(e) => set('mapsEmbedUrl', e.target.value)} /></div>
        </CardContent></Card></TabsContent>

        <TabsContent value="social"><Card><CardHeader><CardTitle className="text-base">Social Links</CardTitle></CardHeader><CardContent className="space-y-3">
          <div><Label>Facebook</Label><Input value={data.socialFacebook || ''} onChange={(e) => set('socialFacebook', e.target.value)} /></div>
          <div><Label>Twitter</Label><Input value={data.socialTwitter || ''} onChange={(e) => set('socialTwitter', e.target.value)} /></div>
          <div><Label>LinkedIn</Label><Input value={data.socialLinkedin || ''} onChange={(e) => set('socialLinkedin', e.target.value)} /></div>
          <div><Label>YouTube</Label><Input value={data.socialYoutube || ''} onChange={(e) => set('socialYoutube', e.target.value)} /></div>
          <div><Label>Instagram</Label><Input value={data.socialInstagram || ''} onChange={(e) => set('socialInstagram', e.target.value)} /></div>
          <div><Label>WhatsApp (phone number or link)</Label><Input value={data.socialWhatsApp || ''} onChange={(e) => set('socialWhatsApp', e.target.value)} placeholder="e.g. 919876543210 or https://wa.me/919876543210" /></div>
        </CardContent></Card></TabsContent>

        <TabsContent value="stats"><Card><CardHeader><CardTitle className="text-base">Statistics (shown on landing page)</CardTitle></CardHeader><CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Students Enrolled</Label><Input type="number" value={data.statStudents} onChange={(e) => set('statStudents', parseInt(e.target.value) || 0)} /></div>
            <div><Label>Courses</Label><Input type="number" value={data.statCourses} onChange={(e) => set('statCourses', parseInt(e.target.value) || 0)} /></div>
            <div><Label>Pass Rate (%)</Label><Input type="number" value={data.statPassRate} onChange={(e) => set('statPassRate', parseInt(e.target.value) || 0)} /></div>
            <div><Label>Years Experience</Label><Input type="number" value={data.statExperience} onChange={(e) => set('statExperience', parseInt(e.target.value) || 0)} /></div>
          </div>
        </CardContent></Card></TabsContent>

        <TabsContent value="platform"><Card><CardHeader><CardTitle className="text-base">Platform Behavior</CardTitle></CardHeader><CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Video Completion Threshold (%)</Label><Input type="number" value={data.videoCompletionThreshold} onChange={(e) => set('videoCompletionThreshold', parseInt(e.target.value) || 90)} /></div>
          </div>
          <div className="space-y-2 pt-3">
          </div>
        </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  )
}
