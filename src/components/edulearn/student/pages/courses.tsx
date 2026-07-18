'use client'

import { ExternalImage } from '@/components/ui/external-image'
import { useApp } from '@/stores/app-store'
import { useApi, PageHeader } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Eye } from 'lucide-react'

interface StudentCourseSummary {
  id: string
  title: string
  description: string | null
  thumbnail: string | null
  totalVideos: number
  completedVideos: number
  progressPct: number
}

export function StudentCourses() {
  const { setView } = useApp()
  const { data, loading } = useApi<{ courses: StudentCourseSummary[] }>('/api/student/courses')

  return (
    <div>
      <PageHeader title="My Courses" subtitle="Courses from your enrolled batches" />
      {loading ? <div className="text-center py-12 text-slate-500">Loading…</div> : !data || data.courses.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-slate-500">No courses available yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.courses.map((c) => (
            <Card key={c.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-slate-100 overflow-hidden">
                {c.thumbnail ? <ExternalImage src={c.thumbnail} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-10 h-10 text-slate-400" /></div>}
              </div>
              <CardContent className="pt-4">
                <h3 className="font-semibold">{c.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description || 'No description'}</p>
                <div className="mt-3 mb-2">
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Progress</span><span className="font-medium">{c.progressPct}%</span></div>
                  <Progress value={c.progressPct} className="h-1.5" />
                </div>
                <div className="text-xs text-slate-500">{c.completedVideos}/{c.totalVideos} videos completed</div>
                <Button size="sm" className="w-full mt-3 bg-blue-700 hover:bg-blue-800" onClick={() => setView({ name: 'student/courses/detail', id: c.id })}><Eye className="w-4 h-4 mr-1" /> Continue Learning</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
