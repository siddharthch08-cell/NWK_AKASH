'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/stores/app-store'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, BookOpen, Users, Award, Clock, PlayCircle, Megaphone, ChevronRight } from 'lucide-react'
import type { PublicSettings, PublicAnnouncement } from './public-site'
import type { PublicBatch } from './public-site'
import { fmtDate } from '@/lib/format'

export function HomePage({
  settings,
  announcements,
}: {
  settings: PublicSettings | null
  announcements: PublicAnnouncement[]
}) {
  const { setView, user } = useApp()
  const [batches, setBatches] = useState<PublicBatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ batches: PublicBatch[] }>('/api/public/batches')
      .then((d) => setBatches(d.batches))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden mesh-bg text-white">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(45,212,191,0.5) 0%, transparent 50%)' }} />
        {/* Decorative floating orbs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="animate-slide-up">
              <Badge variant="secondary" className="mb-4 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur">
                {settings?.tagline || 'Advanced Learning Management System'}
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
                {settings?.heroTitle || 'Unlock Your Potential with EDULEARN PRO'}
              </h1>
              <p className="mt-5 text-base sm:text-lg text-blue-100 max-w-xl leading-relaxed">
                {settings?.heroSubtitle || 'Industry-leading courses, expert faculty, and a learning experience designed for your success.'}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" onClick={() => setView({ name: user ? 'public/register' : 'public/register' })} className="bg-white text-blue-800 hover:bg-blue-50 btn-glow font-semibold">
                  Enroll Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => setView({ name: 'public/courses' })} className="border-white/30 text-white hover:bg-white/10 backdrop-blur">
                  Explore Courses
                </Button>
              </div>
              {/* Trust indicators */}
              <div className="mt-8 flex items-center gap-6 text-xs text-blue-100/80">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live batches running</div>
                <div className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> 94% pass rate</div>
                <div className="hidden sm:flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> 5,000+ learners</div>
              </div>
            </div>
            <div className="hidden lg:block animate-fade-in">
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20">
                <img
                  src={settings?.heroImage || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80'}
                  alt="Students learning"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent" />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Students Enrolled', value: settings?.statStudents ?? 0, suffix: '+' },
              { icon: BookOpen, label: 'Courses & Batches', value: settings?.statCourses ?? 0, suffix: '+' },
              { icon: Award, label: 'Pass Rate', value: settings?.statPassRate ?? 0, suffix: '%' },
              { icon: Clock, label: 'Years Experience', value: settings?.statExperience ?? 0, suffix: '+' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 card-lift hover:bg-white/15">
                <stat.icon className="w-6 h-6 mb-2 text-teal-300" />
                <div className="text-2xl sm:text-3xl font-bold tabular-nums">{stat.value.toLocaleString()}{stat.suffix}</div>
                <div className="text-xs text-blue-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Announcements ticker */}
      {announcements.length > 0 && (
        <section className="bg-amber-50 border-y border-amber-200" aria-label="Announcements">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm shrink-0">
                <Megaphone className="w-4 h-4" />
                <span className="hidden sm:inline">Announcements</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex gap-6 animate-marquee whitespace-nowrap">
                  {[...announcements, ...announcements].map((a, i) => (
                    <span key={i} className="text-sm text-amber-900 inline-flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${a.priority === 'HIGH' || a.priority === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <strong>{a.title}:</strong> <span className="text-amber-800">{a.message}</span>
                    </span>
                  ))}
                </div>
              </div>
              <Button variant="link" size="sm" className="text-amber-800 shrink-0" onClick={() => setView({ name: 'public/announcements' })}>
                View all <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <style jsx>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-marquee {
              animation: marquee 40s linear infinite;
            }
            .animate-marquee:hover {
              animation-play-state: paused;
            }
          `}</style>
        </section>
      )}

      {/* Courses preview */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Featured Batches & Courses</h2>
              <p className="text-slate-600 mt-1">Start your learning journey with our most popular programs</p>
            </div>
            <Button variant="outline" onClick={() => setView({ name: 'public/courses' })} className="hidden sm:inline-flex">
              View All <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading && (
              <>
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="aspect-video bg-slate-200 animate-pulse" />
                    <CardContent className="p-5">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-3 animate-pulse" />
                      <div className="h-3 bg-slate-200 rounded w-full mb-2 animate-pulse" />
                      <div className="h-3 bg-slate-200 rounded w-2/3 animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
            {!loading && batches.length === 0 && (
              <div className="col-span-full text-center py-12">
                <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h3 className="text-lg font-semibold text-slate-700">No batches available yet</h3>
                <p className="text-slate-500 mt-1">Please check back later or contact us for upcoming schedules.</p>
              </div>
            )}
            {batches.map((b) => (
              <Card key={b.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="aspect-video bg-slate-100 overflow-hidden">
                  {b.thumbnail ? (
                    <img src={b.thumbnail} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <BookOpen className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={b.status === 'ACTIVE' ? 'default' : 'secondary'} className={b.status === 'ACTIVE' ? 'bg-emerald-600' : ''}>
                      {b.status}
                    </Badge>
                    {b.capacity && (
                      <span className="text-xs text-slate-500">{b.enrolledCount}/{b.capacity} enrolled</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">{b.name}</h3>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">{b.description || 'No description available'}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Starts: {fmtDate(b.startDate)}</span>
                    <Button size="sm" variant="ghost" onClick={() => setView({ name: user ? 'public/register' : 'public/login' })} className="text-blue-700 hover:text-blue-800 p-0 h-auto">
                      Login to Enroll
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About preview */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-3 border-blue-200 text-blue-700">About Us</Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                A platform built by educators, for learners
              </h2>
              <p className="text-slate-600 mb-4">
                {settings?.aboutText || 'EDULEARN PRO is a next-generation learning platform that combines structured courses, video lectures, timed assessments, and detailed analytics.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div>
                  <h4 className="font-semibold text-blue-700 mb-1">Our Mission</h4>
                  <p className="text-sm text-slate-600">{settings?.aboutMission || 'To democratize quality education through technology.'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-teal-700 mb-1">Our Vision</h4>
                  <p className="text-sm text-slate-600">{settings?.aboutVision || 'A world where any learner can master the skills they need.'}</p>
                </div>
              </div>
              <Button variant="outline" className="mt-6" onClick={() => setView({ name: 'public/about' })}>
                Learn more <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-square rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white flex flex-col justify-between">
                <PlayCircle className="w-8 h-8" />
                <div>
                  <div className="text-3xl font-bold">100+</div>
                  <div className="text-sm text-blue-100">Video Lectures</div>
                </div>
              </div>
              <div className="aspect-square rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-6 text-white flex flex-col justify-between mt-8">
                <Award className="w-8 h-8" />
                <div>
                  <div className="text-3xl font-bold">{settings?.statPassRate ?? 94}%</div>
                  <div className="text-sm text-teal-50">Pass Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-800 to-teal-700 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to start learning?</h2>
          <p className="text-blue-100 mb-6">Register today and get approved by our admin team to access all courses, materials, and assessments.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => setView({ name: 'public/register' })} className="bg-white text-blue-800 hover:bg-blue-50">
              Create Free Account
            </Button>
            <Button size="lg" variant="outline" onClick={() => setView({ name: 'public/contact' })} className="border-white/30 text-white hover:bg-white/10">
              Talk to Us
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
