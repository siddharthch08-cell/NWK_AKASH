'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Megaphone, Pin } from 'lucide-react'
import type { PublicAnnouncement } from './public-site'
import { fmtDate } from '@/lib/format'

export function AnnouncementsPage({ announcements }: { announcements: PublicAnnouncement[] }) {
  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-gradient-to-br from-blue-900 to-teal-800 text-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold">Announcements</h1>
          <p className="mt-2 text-blue-100">Stay up to date with the latest news and updates.</p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {announcements.length === 0 ? (
            <div className="text-center py-16">
              <Megaphone className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-semibold text-slate-700">No announcements yet</h3>
              <p className="text-slate-500 mt-1">Check back soon for updates.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => (
                <Card key={a.id} className={a.pinned ? 'border-amber-300 bg-amber-50/50' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {a.pinned && <Pin className="w-4 h-4 text-amber-600" />}
                        <CardTitle className="text-lg">{a.title}</CardTitle>
                      </div>
                      <Badge variant={
                        a.priority === 'CRITICAL' ? 'destructive' :
                        a.priority === 'HIGH' ? 'default' :
                        'secondary'
                      } className={a.priority === 'HIGH' ? 'bg-orange-500' : ''}>
                        {a.priority}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500">{fmtDate(a.publishAt)}</div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-700 whitespace-pre-wrap">{a.message}</p>
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
