'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, Eye, Users, BookOpen, Award, Clock, ShieldCheck, Sparkles, Scale, Gavel, Heart, Calendar, CheckCircle2, MessageCircle, PlayCircle } from 'lucide-react'
import type { PublicSettings } from './public-site'

export function AboutPage({ settings }: { settings: PublicSettings | null }) {
  const stats = [
    { icon: Users, label: 'Students Enrolled', value: (settings?.statStudents ?? 500).toLocaleString() + '+' },
    { icon: BookOpen, label: 'Course Tracks', value: (settings?.statCourses ?? 3).toString() },
    { icon: Award, label: 'Success Rate', value: (settings?.statPassRate ?? 92) + '%' },
    { icon: Clock, label: 'Years of Experience', value: (settings?.statExperience ?? 4) + '+' },
  ]

  const values = [
    { icon: ShieldCheck, title: 'Theory Meets Practice', text: 'Every concept is taught in both its theoretical and practical dimensions — you don\'t just learn the law, you master its application.' },
    { icon: PlayCircle, title: 'Concept-Made-Easy Videos', text: 'Complex topics simplified through short, focused videos for instant clarity.' },
    { icon: CheckCircle2, title: 'Answer Writing from Day 1', text: 'Descriptive answer writing built into your routine from the very first day, not saved for the end.' },
    { icon: Calendar, title: 'Daily Question Papers', text: 'Every topic taught is reinforced with a 10-question paper on the same day (9 objective + 1 descriptive).' },
    { icon: MessageCircle, title: 'Live Answer Checking System', text: 'Your answers are evaluated in real time, with instant feedback that shows you exactly where you stand and how to improve.' },
    { icon: Sparkles, title: '100% Study Material Provided', text: 'Complete, ready-to-use material delivered to you — nothing left to chase elsewhere.' },
  ]

  const exams = [
    { icon: Scale, name: 'Additional District Judge (ADJ)' },
    { icon: Gavel, name: 'All State Comprehensive Judiciary' },
    { icon: ShieldCheck, name: 'Assistant Prosecution Officer (APO)' },
    { icon: BookOpen, name: 'Junior Legal Officer (JLO)' },
    { icon: Users, name: 'Law Students' },
  ]

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 to-teal-800 text-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge variant="secondary" className="mb-3 bg-white/10 text-white border-white/20">About Us</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold">{settings?.instituteName || 'Naya Wallah Kanoon'}</h1>
          <p className="mt-3 text-blue-100 max-w-3xl text-lg">{settings?.heroSubtitle || 'Judicial services preparation, now at your doorstep.'}</p>
          {/* Taglines */}
          <div className="mt-6 space-y-1">
            <div className="text-xl font-bold text-amber-300">कर लो दुनिया मुठ्ठी में</div>
            <div className="text-2xl font-bold">New Law ~ New Way</div>
            <div className="text-sm text-teal-200">Beginning | Consistency | Result</div>
          </div>
        </div>
      </section>

      {/* Main About Text */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Card className="mb-8">
            <CardContent className="pt-6">
              <p className="text-slate-700 leading-relaxed text-lg">
                {settings?.aboutText || 'Naya Wallah Kanoon Judicial Classes is a dedicated coaching platform built to guide sincere aspirants toward a career in law. We are accessible anywhere — we now reach you right at your doorstep.'}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardHeader>
                <Target className="w-8 h-8 text-blue-700 mb-2" />
                <CardTitle>Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{settings?.aboutMission || 'To deliver sharp, reliable preparation to every sincere aspirant — treating each one not as a number, but as family.'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Eye className="w-8 h-8 text-teal-700 mb-2" />
                <CardTitle>Our Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{settings?.aboutVision || 'A platform built on you — our students. Naya Wallah Kanoon humse nahi, aapse… humare students se bana hai.'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {stats.map((s, i) => (
              <Card key={i} className="text-center card-lift">
                <CardContent className="pt-6">
                  <s.icon className="w-7 h-7 mx-auto mb-2 text-blue-700" />
                  <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Examinations We Prepare You For */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Examinations We Prepare You For</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam, i) => (
              <Card key={i} className="card-lift">
                <CardContent className="pt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <exam.icon className="w-5 h-5 text-blue-700" />
                  </div>
                  <span className="font-medium text-slate-900">{exam.name}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What Sets Us Apart */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">What Sets Us Apart</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <Card key={i} className="card-lift">
                <CardContent className="pt-6 flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <v.icon className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{v.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{v.text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly Test Series */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Weekly Test Series</h2>
          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center mb-6">
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
              <p className="text-center text-sm text-slate-600">
                A full 100-question paper every week, modelled on the real exam pattern. 90 objective questions to sharpen accuracy and speed, plus 10 descriptive questions to strengthen answer-writing command. Consistent, exam-like practice that keeps you in peak test temperament all year round.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Personalised Mentorship */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Card className="border-2 border-blue-200">
            <CardContent className="pt-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Personalised Mentorship</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                One-to-One Guidance for every student — individual attention that tracks your progress, targets your weak areas, and keeps you on course. Every student is family, and we mean it literally.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Our Founder */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-700 to-teal-600 flex items-center justify-center text-white text-3xl font-bold shrink-0">
                  AF
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-bold text-slate-900">Adv. Akash Faujdar</h2>
                  <p className="text-sm text-slate-500 mb-2">Practising at the Rajasthan High Court since 2021</p>
                  <p className="text-slate-600 text-sm">
                    His vision is simple — deliver sharp, reliable preparation to every sincere aspirant, and treat each one not as a number, but as family.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* We Are a Family */}
      <section className="py-16 bg-gradient-to-br from-blue-900 to-teal-800 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <Heart className="w-12 h-12 mx-auto mb-4 text-rose-400" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">We Are a Family</h2>
          <p className="text-lg text-blue-100 mb-6">
            At Naya Wallah Kanoon, every student is family — and we mean it literally.
          </p>
          <p className="text-xl text-amber-300 font-medium italic mb-6">
            &quot;Naya Wallah Kanoon humse nahi, aapse… humare students se bana hai.&quot;
          </p>
          <p className="text-blue-100">
            This platform isn&apos;t built on our name. It&apos;s built on you — our students.
          </p>
        </div>
      </section>

      {/* Join Us CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">Join Us</h2>
          <p className="text-lg text-slate-600 mb-2">
            <b> <i className="italic">&quot;Aao हमें join karo, मिलके kuch crazy करते hain Law mein.&quot;</i></b>
          </p>
          <p className="text-slate-500 max-w-xl mx-auto mb-6">
            Become a part of the Naya Wallah Kanoon family, and we promise to stand by you at every step of your preparation. Give us your effort and trust — and we assure you, you will never regret the decision to join us.
          </p>
          <div className="inline-flex items-center gap-2 text-slate-700">
            <span className="font-semibold">For any enquiry, contact:</span>
            <a href="tel:9660315644" className="text-blue-700 font-bold hover:underline">9660315644</a>
          </div>
        </div>
      </section>
    </div>
  )
}
