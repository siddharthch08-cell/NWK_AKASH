'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/stores/app-store'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowRight, BookOpen, Users, Award, Clock, PlayCircle, Megaphone, ChevronRight, ChevronLeft,
  Scale, Gavel, Shield, CheckCircle2, Send, Loader2,
  Calendar, Gift, MessageCircle, HelpCircle,
} from 'lucide-react'
import type { PublicSettings, PublicAnnouncement } from './public-site'
import type { PublicBatch } from './public-site'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const counsellingSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  subject: z.string().min(2, 'Subject is required'),
  contact: z.string().min(10, 'Valid contact number is required'),
})

type CounsellingForm = z.infer<typeof counsellingSchema>

const publicStat = (value: number | undefined, fallback: number) => value && value > 0 ? value : fallback

const COURSES = [
  {
    icon: Scale,
    title: 'Judiciary',
    description: 'Comprehensive preparation for all State Judiciary exams. Covers Constitutional Law, IPC, CrPC, CPC, Evidence Act, and more.',
    exams: 'All State Comprehensive Judiciary',
  },
  {
    icon: Gavel,
    title: 'Additional District Judge (ADJ)',
    description: 'Specialised preparation for the ADJ examination with focus on advanced legal concepts and answer writing.',
    exams: 'Additional District Judge',
  },
  {
    icon: Shield,
    title: 'Assistant Prosecution Officer (APO)',
    description: 'Targeted APO preparation including all core subjects. Group discussions are currently held for APO students after 10:00 PM.',
    exams: 'Assistant Prosecution Officer',
  },
]

const WHAT_SETS_APART = [
  { icon: BookOpen, title: 'Theory Meets Practice', text: 'Every concept is taught in both its theoretical and practical dimensions — you don\'t just learn the law, you master its application.' },
  { icon: PlayCircle, title: 'Concept-Made-Easy Videos', text: 'Complex topics simplified through short, focused videos for instant clarity.' },
  { icon: CheckCircle2, title: 'Answer Writing from Day 1', text: 'Descriptive answer writing built into your routine from the very first day, not saved for the end.' },
  { icon: Calendar, title: 'Daily Question Papers', text: 'Every topic taught is reinforced with a question paper on the same day — 10 questions (9 objective + 1 descriptive).' },
  { icon: MessageCircle, title: 'Live Answer Checking System', text: 'Your answers are evaluated in real time, with instant feedback that shows you exactly where you stand.' },
  { icon: Gift, title: '100% Study Material Provided', text: 'Complete, ready-to-use material delivered to you — nothing left to chase elsewhere.' },
]

const FREE_RESOURCES = [
  { icon: PlayCircle, title: 'Free Probation Course', text: 'A complete free course on the Probation of Offenders Act, 1958.', destination: 'student/courses' as const },
  { icon: HelpCircle, title: 'One Free Sample QP', text: 'A free sample question paper with our OMR-style test interface and auto-evaluation.', destination: 'student/tests' as const },
  { icon: MessageCircle, title: 'Free Counselling', text: 'Free counselling within 24 hours is available to enrolled students.', destination: 'student/feedback' as const },
]

const FAQS = [
  {
    q: 'Which exams does Naya Wallah Kanoon prepare students for?',
    a: 'Judiciary, ADJ, and APO, along with comprehensive judiciary preparation. We also cater to Junior Legal Officer (JLO) and law students.',
  },
  {
    q: 'Are there different batch timings?',
    a: 'Yes — a morning batch (6:30 AM – 7:30 AM) and an evening batch (8:00 PM – 9:00 PM major subject, 9:00 PM – 10:00 PM minor subject) are available. APO also has group discussion from 10:00 PM onwards. Students can choose as per preference.',
  },
  {
    q: 'What is the fee structure?',
    a: '₹2,200 per month (after a 12% discount on ₹2,500), plus a one-time security deposit adjustable in the final month. The course runs till the examination.',
  },
  {
    q: 'Are any free resources available?',
    a: 'A complete free course on the Probation of Offenders Act, 1958, a free sample QP, and free counselling within 24 hours are available.',
  },
  {
    q: 'How do the online tests work?',
    a: 'Objective tests use an OMR-style sheet with a timer and limited attempts (e.g., free tests allow 3 attempts). Results are calculated and shown automatically after submission.',
  },
  {
    q: 'Can I clear my doubts before joining?',
    a: 'Yes — fill the counselling form (name, subject, contact) and receive free counselling within 24 hours.',
  },
]

export function HomePage({
  settings,
  announcements,
}: {
  settings: PublicSettings | null
  announcements: PublicAnnouncement[]
}) {
  const { setView, user } = useApp()
  const [_batches, setBatches] = useState<PublicBatch[]>([])
  const [_loading, setLoading] = useState(true)
  const [slide, setSlide] = useState(0)
  const carouselImages = [
    settings?.heroImage,
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=85',
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=85',
  ].filter(Boolean) as string[]

  useEffect(() => {
    api.get<{ batches: PublicBatch[] }>('/api/public/batches')
      .then((d) => setBatches(d.batches))
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % carouselImages.length), 5000)
    return () => window.clearInterval(timer)
  }, [carouselImages.length])

  const openProtectedResource = (destination: 'student/courses' | 'student/tests' | 'student/feedback') => {
    if (user?.role === 'STUDENT' && (user.status === 'ACTIVE' || user.status === 'APPROVED')) {
      setView({ name: destination })
    } else {
      setView({ name: 'public/register' })
    }
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden mesh-bg text-white">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(45,212,191,0.5) 0%, transparent 50%)' }} />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="animate-slide-up">
              <Badge variant="secondary" className="mb-4 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur">
                {settings?.tagline || 'Judicial Classes — New Law, New Way'}
              </Badge>

              {/* Stacked taglines */}
              <div className="mb-4 space-y-1">
                <div className="text-2xl sm:text-3xl font-bold text-amber-300 tracking-tight">
                  कर लो दुनिया मुठ्ठी में
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
                  {settings?.heroTitle || 'New Law ~ New Way'}
                </h1>
                <div className="text-lg text-teal-200 font-medium mt-2">
                  Beginning | Consistency | Result
                </div>
              </div>

              <p className="mt-5 text-base sm:text-lg text-blue-100 max-w-xl leading-relaxed">
                {settings?.heroSubtitle || 'Judicial services preparation, now at your doorstep. A dedicated coaching platform built to guide sincere aspirants toward a career in law.'}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" onClick={() => setView({ name: 'public/register' })} className="bg-white text-blue-800 hover:bg-blue-50 btn-glow font-semibold">
                  Enroll Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })} className="border-white/30 bg-transparent text-white hover:bg-white/10 backdrop-blur">
                  Explore Courses
                </Button>
              </div>
              {/* Trust indicators */}
              <div className="mt-8 flex items-center gap-6 text-xs text-blue-100/80">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Batches running now</div>
                <div className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> {publicStat(settings?.statPassRate, 92)}% success rate</div>
                <div className="hidden sm:flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {publicStat(settings?.statStudents, 500)}+ students</div>
              </div>
            </div>
            <div className="relative block animate-fade-in">
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20" aria-roledescription="carousel" aria-label="Naya Wallah Kanoon highlights">
                {carouselImages.map((image, index) => (
                  <img
                    key={image}
                    src={image}
                    alt={index === 0 && settings?.heroImage ? 'Naya Wallah Kanoon classroom' : index === 1 ? 'Legal education and judiciary preparation' : 'Focused law study and note-taking'}
                    className={index === slide ? 'absolute inset-0 w-full h-full object-cover opacity-100 transition-opacity duration-700' : 'absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-700'}
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent" />
                <button type="button" onClick={() => setSlide((slide - 1 + carouselImages.length) % carouselImages.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/50 p-2 text-white hover:bg-slate-950/70" aria-label="Previous photo"><ChevronLeft className="h-5 w-5" /></button>
                <button type="button" onClick={() => setSlide((slide + 1) % carouselImages.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/50 p-2 text-white hover:bg-slate-950/70" aria-label="Next photo"><ChevronRight className="h-5 w-5" /></button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                  {carouselImages.map((_, index) => <button key={index} type="button" onClick={() => setSlide(index)} className={index === slide ? 'h-2 w-6 rounded-full bg-white transition-all' : 'h-2 w-2 rounded-full bg-white/60 transition-all'} aria-label={'Show photo ' + (index + 1)} aria-current={index === slide} />)}
                </div>
              </div>
              {/* Floating stat cards */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl p-4 text-slate-900 max-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="w-5 h-5 text-blue-700" />
                  <span className="font-bold text-sm">3 Course Tracks</span>
                </div>
                <div className="text-xs text-slate-500">Judiciary · ADJ · APO</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Students Enrolled', value: publicStat(settings?.statStudents, 500), suffix: '+' },
              { icon: BookOpen, label: 'Course Tracks', value: publicStat(settings?.statCourses, 3), suffix: '' },
              { icon: Award, label: 'Success Rate', value: publicStat(settings?.statPassRate, 92), suffix: '%' },
              { icon: Clock, label: 'Years Experience', value: publicStat(settings?.statExperience, 4), suffix: '+' },
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
            @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            .animate-marquee { animation: marquee 40s linear infinite; }
            .animate-marquee:hover { animation-play-state: paused; }
          `}</style>
        </section>
      )}

      {/* Courses Section */}
      <section id="courses" className="py-16 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-3 border-blue-200 text-blue-700">Our Courses</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Three Tracks. Two Batches. One Goal.</h2>
            <p className="text-slate-600 mt-2 max-w-2xl mx-auto">Choose your track and your shift. Morning and evening batches available for every course.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {COURSES.map((course) => (
              <Card key={course.title} role="link" tabIndex={0} onClick={() => setView({ name: user?.role === 'STUDENT' ? 'student/dashboard' : user?.role === 'ADMIN' ? 'admin/dashboard' : 'public/register' })} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setView({ name: user?.role === 'STUDENT' ? 'student/dashboard' : user?.role === 'ADMIN' ? 'admin/dashboard' : 'public/register' }) }} className="card-lift cursor-pointer overflow-hidden border-2 hover:border-blue-300 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-teal-600 flex items-center justify-center mb-4">
                    <course.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{course.title}</h3>
                  <p className="text-sm text-slate-600 mb-4">{course.description}</p>
                  <div className="text-xs text-slate-500 mb-3"><strong>Exam:</strong> {course.exams}</div>
                  <div className="mt-4 flex w-full items-center justify-center rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800">
                    Enroll Now <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Fee Structure */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-3 border-emerald-200 text-emerald-700">Fee Structure</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Simple, Transparent Pricing</h2>
          </div>
          <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                    <span className="text-3xl font-bold text-slate-900">₹2,200</span>
                    <span className="text-lg text-slate-400 line-through">₹2,500</span>
                    <Badge className="bg-emerald-600">12% OFF</Badge>
                  </div>
                  <div className="text-sm text-slate-600">per month · Course runs till examination</div>
                </div>
                <div className="space-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> One-time security deposit (adjustable in final month)</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% study material included</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Daily question papers & live answer checking</div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-center">
                <span className="text-sm font-semibold text-rose-700">🔥 &quot;Join Soon&quot; Offer — Limited Time Launch Discount. Offer ends soon!</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* What Sets Us Apart */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-3 border-blue-200 text-blue-700">Why Choose Us</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">What Sets Us Apart</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHAT_SETS_APART.map((item, i) => (
              <Card key={i} className="card-lift">
                <CardContent className="pt-6 flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{item.text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly Test Series */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-3 border-amber-200 text-amber-700">Test Series</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Weekly Test Series</h2>
          </div>
          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-4xl font-bold text-amber-700">100</div>
                  <div className="text-sm text-slate-600 mt-1">Questions per week</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-amber-700">90</div>
                  <div className="text-sm text-slate-600 mt-1">Objective questions</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-amber-700">10</div>
                  <div className="text-sm text-slate-600 mt-1">Descriptive questions</div>
                </div>
              </div>
              <p className="text-center text-sm text-slate-600 mt-4">
                A full 100-question paper every week, modelled on the real exam pattern. Consistent, exam-like practice that keeps you in peak test temperament all year round.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Free Resources */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-3 border-emerald-200 text-emerald-700">Free Resources</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">नाम लिखवाने से पहले आज़माएं</h2>
            <p className="text-slate-600 mt-2">Get a feel of our classes before you commit.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FREE_RESOURCES.map((item, i) => (
              <Card key={i} role="link" tabIndex={0} onClick={() => openProtectedResource(item.destination)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openProtectedResource(item.destination) }} className="card-lift cursor-pointer text-center focus-visible:ring-2 focus-visible:ring-blue-600">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.text}</p>
                  <div className="mt-4 inline-flex items-center text-sm font-semibold text-blue-700">Open resource <ArrowRight className="ml-1 h-4 w-4" /></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Free Counselling Form */}
      <section id="counselling" className="py-16 bg-gradient-to-br from-blue-900 to-teal-800 text-white">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-3 bg-white/10 text-white border-white/20">Free Counselling</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold">Get free counselling within 24 hours</h2>
            <p className="text-blue-100 mt-2">Clear all your doubts before joining. Fill the form and we&apos;ll contact you within 24 hours.</p>
          </div>
          <CounsellingFormSection />
        </div>
      </section>

      {/* About Preview */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-3 border-blue-200 text-blue-700">About Us</Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                A platform built on you — our students.
              </h2>
              <p className="text-slate-600 mb-4">
                {settings?.aboutText?.split('.').slice(0, 2).join('.') + '.' || 'Naya Wallah Kanoon Judicial Classes — judicial services preparation, now at your doorstep.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div>
                  <h4 className="font-semibold text-blue-700 mb-1">Our Mission</h4>
                  <p className="text-sm text-slate-600">{settings?.aboutMission || 'To deliver sharp, reliable preparation to every sincere aspirant.'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-teal-700 mb-1">Our Vision</h4>
                  <p className="text-sm text-slate-600">{settings?.aboutVision || 'A platform built on you — our students.'}</p>
                </div>
              </div>
              <Button variant="outline" className="mt-6" onClick={() => setView({ name: 'public/about' })}>
                Learn more <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-square rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 p-6 text-white flex flex-col justify-between">
                <Scale className="w-8 h-8" />
                <div>
                  <div className="text-2xl font-bold">100+</div>
                  <div className="text-sm text-blue-100">Video Lectures</div>
                </div>
              </div>
              <div className="aspect-square rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-6 text-white flex flex-col justify-between mt-8">
                <Award className="w-8 h-8" />
                <div>
                  <div className="text-2xl font-bold">{publicStat(settings?.statPassRate, 92)}%</div>
                  <div className="text-sm text-teal-50">Success Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student Feedback */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-teal-50">
            <CardContent className="flex flex-col items-center gap-5 pt-6 text-center sm:flex-row sm:text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-teal-600 text-white">
                <MessageCircle className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <Badge variant="outline" className="mb-2 border-blue-200 text-blue-700">Student Feedback</Badge>
                <h2 className="text-2xl font-bold text-slate-900">Help us make every class better</h2>
                <p className="mt-2 text-sm text-slate-600">Enrolled students can share course, test, video, or general feedback directly with the teaching team.</p>
              </div>
              <Button onClick={() => openProtectedResource('student/feedback')} className="shrink-0 bg-blue-700 hover:bg-blue-800">
                {user?.role === 'STUDENT' ? 'Share Feedback' : 'Enroll to Participate'} <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-3 border-blue-200 text-blue-700">FAQ</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-800 to-teal-700 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Aao humein join karo, milke kuch crazy karte hain law mein.</h2>
          <p className="text-blue-100 mb-6">Become a part of the Naya Wallah Kanoon family. Give us your effort and trust — and we assure you, you will never regret the decision to join us.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => setView({ name: 'public/register' })} className="bg-white text-blue-800 hover:bg-blue-50 btn-glow">
              Create Free Account
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById('counselling')?.scrollIntoView({ behavior: 'smooth' })} className="border-white/30 bg-transparent text-white hover:bg-white/10">
              Get Free Counselling
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}

function CounsellingFormSection() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CounsellingForm>({
    resolver: zodResolver(counsellingSchema),
  })
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (data: CounsellingForm) => {
    setSubmitting(true)
    try {
      await api.post('/api/public/contact', {
        name: data.name,
        email: 'counselling@nayawallahkanoon.in',
        phone: data.contact,
        subject: `Free Counselling Request: ${data.subject}`,
        message: `Counselling request from ${data.name}. Subject: ${data.subject}. Contact: ${data.contact}. Please contact within 24 hours.`,
      })
      toast.success('Counselling request submitted! We will contact you within 24 hours.')
      reset()
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message)
      else toast.error('Failed to submit. Please call 9660315644.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="cname" className="text-white">Name</Label>
            <Input id="cname" {...register('name')} className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40" placeholder="Your full name" />
            {errors.name && <p className="text-xs text-rose-300 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="csubject" className="text-white">Subject</Label>
            <Input id="csubject" {...register('subject')} className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40" placeholder="e.g. Criminal Law, Constitutional Law" />
            {errors.subject && <p className="text-xs text-rose-300 mt-1">{errors.subject.message}</p>}
          </div>
          <div>
            <Label htmlFor="ccontact" className="text-white">Contact Number</Label>
            <Input id="ccontact" {...register('contact')} className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40" placeholder="+91 98765 43210" />
            {errors.contact && <p className="text-xs text-rose-300 mt-1">{errors.contact.message}</p>}
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-white text-blue-800 hover:bg-blue-50 btn-glow font-semibold">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {submitting ? 'Submitting…' : 'Apply for Free Counselling'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-medium text-slate-900 pr-4">{q}</span>
        <ChevronRight className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <CardContent className="pt-0 border-t">
          <p className="text-sm text-slate-600 py-3">{a}</p>
        </CardContent>
      )}
    </Card>
  )
}
