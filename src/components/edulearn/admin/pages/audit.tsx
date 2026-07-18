'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { useToastAction, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { History, Loader2, Search } from 'lucide-react'
import { fmtDateTime, relativeTime } from '@/lib/format'

interface Log { id: string; action: string; entityType?: string | null; entityId?: string | null; actorRole?: string | null; ip?: string | null; timestamp: string; actor?: { name: string; email: string } | null }

export function AdminAudit() {
  const toastAction = useToastAction()
  const [data, setData] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 20

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search) params.set('search', search)
    api.get<{ items: Log[]; total: number; totalPages: number }>(`/api/admin/audit-logs?${params}`)
      .then((d) => { setData(d.items); setTotal(d.total); setTotalPages(d.totalPages) })
      .catch((e) => toastAction.error(e))
      .finally(() => setLoading(false))
  }, [page, search, toastAction])

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Append-only record of admin and security actions" />
      <Card className="mb-4"><CardContent className="pt-4">
        <div className="relative"><Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" /><Input placeholder="Search by action (e.g. STUDENT_APPROVED)…" className="pl-8" onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        {loading ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div> : data.length === 0 ? <EmptyState icon={History} title="No audit logs" message="Admin actions will be recorded here." /> : (
          <>
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead className="hidden md:table-cell">Actor</TableHead><TableHead className="hidden lg:table-cell">IP</TableHead><TableHead>Timestamp</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell><Badge variant="outline" className="text-xs">{l.action.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-xs text-slate-600">{l.entityType || '—'}{l.entityId ? ` · ${l.entityId.slice(-6)}` : ''}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{l.actor?.name || l.actorRole || 'System'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-slate-500">{l.ip || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-500">{fmtDateTime(l.timestamp)}<div className="text-slate-400">{relativeTime(l.timestamp)}</div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
            {totalPages > 1 && <div className="flex items-center justify-between p-3 border-t">
              <div className="text-xs text-slate-500">{total} total logs</div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
                <span className="text-xs text-slate-500 self-center px-2">Page {page} of {totalPages}</span>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>}
          </>
        )}
      </CardContent></Card>
    </div>
  )
}
