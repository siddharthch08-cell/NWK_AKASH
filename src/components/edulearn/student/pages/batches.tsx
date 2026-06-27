'use client'

import { useApp } from '@/stores/app-store'
import { useApi } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GraduationCap, BookOpen, FileQuestion, Calendar, Eye } from 'lucide-react'
import { fmtDate, statusColor } from '@/lib/format'
import { PageHeader } from '../../shared/admin-helpers'

export function StudentBatches() {
  const { setView } = useApp()
  const { data, loading } = useApi<{ batches: any[] }>('/api/student/batches')

  return (
    <div>
      <PageHeader title="My Batches" subtitle="Batches you are enrolled in" />
      {loading ? <div className="text-center py-12 text-slate-500">Loading…</div> : !data || data.batches.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-slate-500">You are not enrolled in any batches yet. Please contact the admin.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.batches.map((b) => (
            <Card key={b.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-slate-100 overflow-hidden">
                {b.thumbnail ? <img src={b.thumbnail} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><GraduationCap className="w-10 h-10 text-slate-400" /></div>}
              </div>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2"><Badge variant="outline" className={statusColor(b.status)}>{b.status}</Badge></div>
                <h3 className="font-semibold">{b.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.description || 'No description'}</p>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {b.courseCount} courses</div>
                  <div className="flex items-center gap-1"><FileQuestion className="w-3 h-3" /> {b.testCount} tests</div>
                  <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtDate(b.startDate)}</div>
                </div>
                <Button size="sm" className="w-full mt-3 bg-blue-700 hover:bg-blue-800" onClick={() => setView({ name: 'student/batches/detail', id: b.id })}><Eye className="w-4 h-4 mr-1" /> View Batch</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
