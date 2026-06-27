'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, Eye, Users, BookOpen, Award, Clock, ShieldCheck, Sparkles } from 'lucide-react'
import type { PublicSettings } from './public-site'

export function AboutPage({ settings }: { settings: PublicSettings | null }) {
  const stats = [
    { icon: Users, label: 'Students Enrolled', value: (settings?.statStudents ?? 0).toLocaleString() + '+' },
    { icon: BookOpen, label: 'Courses & Batches', value: (settings?.statCourses ?? 0).toLocaleString() + '+' },
    { icon: Award, label: 'Pass Rate', value: (settings?.statPassRate ?? 0) + '%' },
    { icon: Clock, label: 'Years of Experience', value: (settings?.statExperience ?? 0) + '+' },
  ]
  const values = [
    { icon: ShieldCheck, title: 'Quality First', text: 'Every course is crafted by industry experts and rigorously reviewed before publishing.' },
    { icon: Users, title: 'Student-Centric', text: 'Our platform is designed around how students actually learn — visual, structured, and interactive.' },
    { icon: Sparkles, title: 'Continuous Improvement', text: 'We iterate on feedback from learners and faculty to improve every release.' },
    { icon: Award, title: 'Outcomes-Driven', text: 'Our 94% pass rate is a testament to the effectiveness of our pedagogy.' },
  ]

  return (
    <div className="bg-white">
      <section className="bg-gradient-to-br from-blue-900 to-teal-800 text-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge variant="secondary" className="mb-3 bg-white/10 text-white border-white/20">About Us</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold">{settings?.instituteName || 'EDULEARN PRO'}</h1>
          <p className="mt-3 text-blue-100 max-w-3xl">{settings?.aboutText || 'A next-generation learning platform.'}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardHeader>
                <Target className="w-8 h-8 text-blue-700 mb-2" />
                <CardTitle>Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{settings?.aboutMission || 'To democratize quality education through technology, making expert-led learning accessible to every motivated student.'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Eye className="w-8 h-8 text-teal-700 mb-2" />
                <CardTitle>Our Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{settings?.aboutVision || 'A world where any learner, anywhere, can master the skills they need to build a meaningful career.'}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {stats.map((s, i) => (
              <Card key={i} className="text-center">
                <CardContent className="pt-6">
                  <s.icon className="w-7 h-7 mx-auto mb-2 text-blue-700" />
                  <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-6">Our Values & Differentiators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <Card key={i}>
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
    </div>
  )
}
