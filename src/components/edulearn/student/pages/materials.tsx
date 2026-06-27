'use client'

import { useApi, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, FileText, Download } from 'lucide-react'
import { fmtDate } from '@/lib/format'

export function StudentMaterials() {
  const { data, loading } = useApi<{ materials: any[] }>('/api/student/materials')

  const download = async (id: string, name: string) => {
    const token = window.localStorage.getItem('edulearn_access_token')
    const res = await fetch(`/api/student/materials/${id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) { alert('Download failed'); return }
    const blob = await res.blob()
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
  }

  return (
    <div>
      <PageHeader title="Study Material" subtitle="PDFs, assignments, and reference files from your batches" />
      {loading ? <div className="text-center py-12 text-slate-500">Loading…</div> : !data || data.materials.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No materials available" message="Materials will appear here once your admin uploads them." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.materials.map((m) => (
            <Card key={m.id}><CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-rose-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.title}</div>
                  <div className="text-xs text-slate-500 truncate">{m.fileName} · {(m.fileSize / 1024).toFixed(0)} KB</div>
                  <div className="mt-1 flex items-center gap-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">{m.materialType}</Badge>
                    {m.batch && <Badge variant="outline" className="text-xs">{m.batch.name}</Badge>}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Uploaded {fmtDate(m.createdAt)}</div>
                  <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => download(m.id, m.fileName)}><Download className="w-4 h-4 mr-1" /> Download</Button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  )
}
