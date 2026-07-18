'use client'

import { useApi, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Megaphone, Pin } from 'lucide-react'
import { fmtDateTime, relativeTime } from '@/lib/format'
import type { Announcement } from '@/types'

type StudentAnnouncement = Pick<Announcement, 'id' | 'title' | 'message' | 'priority' | 'pinned' | 'publishAt'>

export function StudentAnnouncements() {
  const { data, loading } = useApi<{ announcements: StudentAnnouncement[] }>('/api/student/announcements')

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Updates relevant to you and your batches" />
      {loading ? <div className="text-center py-12 text-slate-500">Loading…</div> : !data || data.announcements.length === 0 ? <EmptyState icon={Megaphone} title="No announcements" message="Announcements will appear here when published." /> : (
        <div className="space-y-3">
          {data.announcements.map((a) => (
            <Card key={a.id} className={a.pinned ? 'border-amber-300 bg-amber-50/30' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.pinned && <Pin className="w-4 h-4 text-amber-600" />}
                    <h3 className="font-semibold">{a.title}</h3>
                    <Badge variant={a.priority === 'CRITICAL' ? 'destructive' : a.priority === 'HIGH' ? 'default' : 'secondary'} className={a.priority === 'HIGH' ? 'bg-orange-500' : ''}>{a.priority}</Badge>
                  </div>
                  <div className="text-xs text-slate-400">{relativeTime(a.publishAt)}</div>
                </div>
                <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{a.message}</p>
                <div className="text-xs text-slate-400 mt-2">{fmtDateTime(a.publishAt)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
