'use client'

import { useApp } from '@/stores/app-store'
import { GraduationCap, Facebook, Twitter, Linkedin, Youtube, Instagram } from 'lucide-react'
import type { PublicSettings } from './public-site'

export function PublicFooter({ settings }: { settings: PublicSettings | null }) {
  const { setView } = useApp()

  return (
    <footer className="mt-auto bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white">{settings?.instituteName || 'EDULEARN PRO'}</span>
            </div>
            <p className="text-sm text-slate-400">{settings?.tagline || 'Advanced Learning Management System'}</p>
            <div className="mt-4 flex gap-2">
              {settings?.socialFacebook && <a href={settings.socialFacebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-slate-400 hover:text-white"><Facebook className="w-5 h-5" /></a>}
              {settings?.socialTwitter && <a href={settings.socialTwitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-slate-400 hover:text-white"><Twitter className="w-5 h-5" /></a>}
              {settings?.socialLinkedin && <a href={settings.socialLinkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-slate-400 hover:text-white"><Linkedin className="w-5 h-5" /></a>}
              {settings?.socialYoutube && <a href={settings.socialYoutube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-slate-400 hover:text-white"><Youtube className="w-5 h-5" /></a>}
              {settings?.socialInstagram && <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-slate-400 hover:text-white"><Instagram className="w-5 h-5" /></a>}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-3 text-sm">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><button className="hover:text-white" onClick={() => setView({ name: 'public/home' })}>Home</button></li>
              <li><button className="hover:text-white" onClick={() => setView({ name: 'public/about' })}>About Us</button></li>
              <li><button className="hover:text-white" onClick={() => setView({ name: 'public/courses' })}>Courses</button></li>
              <li><button className="hover:text-white" onClick={() => setView({ name: 'public/announcements' })}>Announcements</button></li>
              <li><button className="hover:text-white" onClick={() => setView({ name: 'public/contact' })}>Contact</button></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-3 text-sm">For Students</h3>
            <ul className="space-y-2 text-sm">
              <li><button className="hover:text-white" onClick={() => setView({ name: 'public/login' })}>Login</button></li>
              <li><button className="hover:text-white" onClick={() => setView({ name: 'public/register' })}>Register</button></li>
              <li><button className="hover:text-white" onClick={() => setView({ name: 'public/courses' })}>Browse Batches</button></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-3 text-sm">Contact</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              {settings?.primaryEmail && <li>{settings.primaryEmail}</li>}
              {settings?.primaryPhone && <li>{settings.primaryPhone}</li>}
              {settings?.address && <li className="text-xs">{settings.address}</li>}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {settings?.instituteName || 'EDULEARN PRO'}. All rights reserved.</p>
          <div className="flex gap-4">
            <button className="hover:text-white">Privacy Policy</button>
            <button className="hover:text-white">Terms</button>
          </div>
        </div>
      </div>
    </footer>
  )
}
