'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/stores/app-store'
import { api } from '@/lib/api-client'
import { PublicHeader } from './public-header'
import { PublicFooter } from './public-footer'
import { HomePage } from './home-page'
import { AboutPage } from './about-page'
import { CoursesPage } from './courses-page'
import { AnnouncementsPage } from './announcements-page'
import { ContactPage } from './contact-page'
import { LoginPage } from './login-page'
import { RegisterPage } from './register-page'

export interface PublicSettings {
  instituteName: string
  tagline: string
  logo?: string
  primaryEmail?: string
  primaryPhone?: string
  address?: string
  mapsEmbedUrl?: string
  heroTitle: string
  heroSubtitle: string
  heroImage?: string
  aboutMission?: string
  aboutVision?: string
  aboutText?: string
  statStudents: number
  statCourses: number
  statPassRate: number
  statExperience: number
  socialFacebook?: string
  socialTwitter?: string
  socialLinkedin?: string
  socialYoutube?: string
  socialInstagram?: string
  maintenanceMode?: boolean
}

export interface PublicAnnouncement {
  id: string
  title: string
  message: string
  priority: string
  pinned: boolean
  publishAt: string
}

export interface PublicBatch {
  id: string
  name: string
  slug: string
  description?: string
  thumbnail?: string
  startDate?: string
  endDate?: string
  status: string
  capacity?: number
  enrolledCount: number
}

export function PublicSite() {
  const { view } = useApp()
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([])

  useEffect(() => {
    api.get<{ settings: PublicSettings }>('/api/public/settings').then((d) => setSettings(d.settings)).catch(() => {})
    api.get<{ announcements: PublicAnnouncement[] }>('/api/public/announcements').then((d) => setAnnouncements(d.announcements)).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader settings={settings} />
      <main className="flex-1">
        {view.name === 'public/home' && <HomePage settings={settings} announcements={announcements} />}
        {view.name === 'public/about' && <AboutPage settings={settings} />}
        {view.name === 'public/courses' && <CoursesPage />}
        {view.name === 'public/announcements' && <AnnouncementsPage announcements={announcements} />}
        {view.name === 'public/contact' && <ContactPage settings={settings} />}
        {view.name === 'public/login' && <LoginPage />}
        {view.name === 'public/register' && <RegisterPage settings={settings} />}
      </main>
      <PublicFooter settings={settings} />
    </div>
  )
}
