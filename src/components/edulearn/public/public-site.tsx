'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useApp } from '@/stores/app-store'
import { api } from '@/lib/api-client'
import { PublicHeader } from './public-header'
import { PublicFooter } from './public-footer'

function PageLoading() {
  return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-slate-500">Loading…</div>
}

const HomePage = dynamic(() => import('./home-page').then((module) => module.HomePage), { loading: PageLoading })
const AboutPage = dynamic(() => import('./about-page').then((module) => module.AboutPage), { loading: PageLoading })
const CoursesPage = dynamic(() => import('./courses-page').then((module) => module.CoursesPage), { loading: PageLoading })
const AnnouncementsPage = dynamic(() => import('./announcements-page').then((module) => module.AnnouncementsPage), { loading: PageLoading })
const ContactPage = dynamic(() => import('./contact-page').then((module) => module.ContactPage), { loading: PageLoading })
const LoginPage = dynamic(() => import('./login-page').then((module) => module.LoginPage), { loading: PageLoading })
const RegisterPage = dynamic(() => import('./register-page').then((module) => module.RegisterPage), { loading: PageLoading })

export interface PublicSettings {
  instituteName: string
  tagline: string
  logo?: string | null
  primaryEmail?: string | null
  primaryPhone?: string | null
  address?: string | null
  mapsEmbedUrl?: string | null
  heroTitle: string
  heroSubtitle: string
  heroImage?: string | null
  aboutMission?: string | null
  aboutVision?: string | null
  aboutText?: string | null
  statStudents: number
  statCourses: number
  statPassRate: number
  statExperience: number
  socialFacebook?: string | null
  socialTwitter?: string | null
  socialLinkedin?: string | null
  socialYoutube?: string | null
  socialInstagram?: string | null
  socialWhatsApp?: string | null
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
  description?: string | null
  thumbnail?: string | null
  startDate?: string | null
  endDate?: string | null
  status: string
  capacity?: number | null
  enrolledCount: number
}

export function PublicSite() {
  const { view } = useApp()
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([])

  useEffect(() => {
    api.get<{ settings: PublicSettings }>('/api/public/settings').then((data) => setSettings(data.settings)).catch(() => {})
    api.get<{ announcements: PublicAnnouncement[] }>('/api/public/announcements').then((data) => setAnnouncements(data.announcements)).catch(() => {})
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
        {view.name === 'public/login' && <LoginPage settings={settings} />}
        {view.name === 'public/register' && <RegisterPage settings={settings} />}
      </main>
      <PublicFooter settings={settings} />
    </div>
  )
}