'use client'

import { useApp } from '@/stores/app-store'
import { GraduationCap, Facebook, Instagram } from 'lucide-react'
import type { PublicSettings } from './public-site'

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function normalizeWhatsAppUrl(val?: string | null): string | null {
  if (!val) return null
  const trimmed = val.trim()
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) return trimmed
  const digits = trimmed.replace(/[^0-9]/g, '')
  return digits ? 'https://wa.me/' + digits : null
}

export function PublicFooter({ settings }: { settings: PublicSettings | null }) {
  const { setView } = useApp()
  const whatsappUrl = normalizeWhatsAppUrl(settings?.socialWhatsApp)

  return (
    <footer className="mt-auto bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white">{settings?.instituteName || 'Naya Wallah Kanoon'}</span>
            </div>
            <p className="text-sm text-slate-400">{settings?.tagline || 'Judicial Classes — New Law, New Way'}</p>
            <div className="mt-4 flex gap-3">
              {settings?.socialInstagram && <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-slate-400 hover:text-pink-400 transition-colors"><Instagram className="w-5 h-5" /></a>}
              {settings?.socialFacebook && <a href={settings.socialFacebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-slate-400 hover:text-blue-500 transition-colors"><Facebook className="w-5 h-5" /></a>}
              {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-slate-400 hover:text-green-500 transition-colors"><WhatsAppIcon className="w-5 h-5" /></a>}
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
          <p>&copy; {new Date().getFullYear()} {settings?.instituteName || 'Naya Wallah Kanoon'}. All rights reserved.</p>
          <div className="flex gap-4">
            <button className="hover:text-white">Privacy Policy</button>
            <button className="hover:text-white">Terms</button>
          </div>
        </div>
      </div>
    </footer>
  )
}
