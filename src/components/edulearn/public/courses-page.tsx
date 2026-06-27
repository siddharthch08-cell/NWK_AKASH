'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { useApp } from '@/stores/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookOpen, Users } from 'lucide-react'
import type { PublicBatch } from './public-site'
import { fmtDate } from '@/lib/format'

export function CoursesPage() {
  const { setView, user } = useApp()
  const [batches, setBatches] = useState<PublicBatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ batches: PublicBatch[] }>('/api/public/batches')
      .then((d) => setBatches(d.batches))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-gradient-to-br from-blue-900 to-teal-800 text-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold">Batches & Courses</h1>
          <p className="mt-2 text-blue-100">Browse our currently open and upcoming programs. Register to enroll.</p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-video bg-slate-200 animate-pulse" />
                  <CardContent className="p-5">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-3 animate-pulse" />
                    <div className="h-3 bg-slate-200 rounded w-full mb-2 animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-semibold text-slate-700">No batches available yet</h3>
              <p className="text-slate-500 mt-1">Please check back later or contact us for upcoming schedules.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      <Badge variant={b.status === 'ACTIVE' ? 'default' : 'secondary'} className={b.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-sky-600'}>
                        {b.status}
                      </Badge>
                      <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                        <Users className="w-3 h-3" /> {b.enrolledCount} enrolled
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">{b.name}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">{b.description || 'No description available'}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span>Starts: {fmtDate(b.startDate)}</span>
                      {b.capacity && <span>Capacity: {b.capacity}</span>}
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-blue-700 hover:bg-blue-800"
                      onClick={() => setView({ name: user ? 'public/register' : 'public/login' })}
                    >
                      {user ? 'Request Enrollment' : 'Login to Enroll'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
