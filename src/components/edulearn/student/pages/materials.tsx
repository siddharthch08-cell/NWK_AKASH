'use client'

import { useApi, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FolderOpen, ExternalLink, FileText } from 'lucide-react'
import { fmtDate } from '@/lib/format'
import { getPlatformLabel, getPlatformColor } from '@/lib/material-url'

interface StudentMaterial {
  id: string
  title: string
  description: string | null
  platform: string
  externalUrl: string
  materialType: string
  createdAt: string
  course: { id: string; title: string }
  chapter: { id: string; title: string }
  topic: { id: string; title: string } | null
}

export function StudentMaterials() {
  const { data, loading } = useApi<{ materials: StudentMaterial[] }>('/api/student/materials')

  if (loading) return <div className="text-center py-12 text-slate-500">Loading…</div>

  return (
    <div>
      <PageHeader title="Study Materials" subtitle="Notes, PDFs, and reference resources from your courses" />
      {!data || data.materials.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No materials available" message="Study materials will appear here once your instructor adds them." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.materials.map((m) => (
            <Card key={m.id} className="card-lift">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{m.title}</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {m.course.title} → {m.chapter.title}{m.topic ? ` → ${m.topic.title}` : ''}
                    </div>
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                      <Badge variant="outline" className={`text-xs ${getPlatformColor(m.platform)}`}>{getPlatformLabel(m.platform)}</Badge>
                      <Badge variant="outline" className="text-xs">{m.materialType}</Badge>
                    </div>
                    {m.description && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{m.description}</p>}
                    <div className="text-xs text-slate-400 mt-2">{fmtDate(m.createdAt)}</div>
                    <a href={m.externalUrl} target="_blank" rel="noopener noreferrer" className="block mt-3">
                      <Button size="sm" className="w-full bg-blue-700 hover:bg-blue-800">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Notes / PDF
                      </Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
