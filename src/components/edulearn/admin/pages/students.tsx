'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/stores/app-store'
import { api } from '@/lib/api-client'
import { useToastAction, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Search, Users, MoreVertical, Check, X, Ban, RotateCcw, Download, Loader2, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { fmtDateTime, statusColor } from '@/lib/format'
import { toast } from 'sonner'

interface Student {
  id: string; name: string; email: string; phone?: string | null; photo?: string | null
  status: string; createdAt: string; lastLoginAt?: string | null; rejectionReason?: string | null
  enrolledBatches: number; testAttempts: number
}

interface ListResp { items: Student[]; page: number; pageSize: number; total: number; totalPages: number }

export function AdminStudents() {
  const { setView } = useApp()
  const toastAction = useToastAction()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [rejectFor, setRejectFor] = useState<Student | null>(null)

  const pageSize = 10

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search) params.set('search', search)
    if (status !== 'ALL') params.set('status', status)
    api.get<ListResp>(`/api/admin/students?${params}`)
      .then((d) => { setData(d); setSelected(new Set()) })
      .catch((e) => toastAction.error(e, 'Failed to load students'))
      .finally(() => setLoading(false))
  }, [page, search, status, toastAction])

  const debouncedSearch = debounce((v: string) => { setSearch(v); setPage(1) }, 400)

  const action = async (student: Student, type: 'approve' | 'reject' | 'block' | 'unblock' | 'activate' | 'deactivate', body?: { reason?: string }) => {
    try {
      await api.post(`/api/admin/students/${student.id}/${type}`, body || {})
      toastAction.success(`Student ${type}d successfully`)
      refresh()
    } catch (e) { toastAction.error(e) }
  }

  const refresh = () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search) params.set('search', search)
    if (status !== 'ALL') params.set('status', status)
    api.get<ListResp>(`/api/admin/students?${params}`)
      .then(setData)
      .finally(() => setLoading(false))
  }

  const bulkApprove = async () => {
    if (selected.size === 0) return
    setBulkLoading(true)
    try {
      const res = await api.post<{ successCount: number; failedCount: number }>('/api/admin/students', { userIds: Array.from(selected) })
      toast.success(`Approved ${res.successCount} student(s)${res.failedCount > 0 ? `, ${res.failedCount} skipped` : ''}`)
      setSelected(new Set())
      refresh()
    } catch (e) { toastAction.error(e) }
    finally { setBulkLoading(false) }
  }

  const exportCsv = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status !== 'ALL') params.set('status', status)
    // Open CSV download with auth token
    const url = `/api/admin/students/export?${params}`
    fetchWithToken(url)
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleSelectAll = () => {
    if (!data) return
    if (selected.size === data.items.length) setSelected(new Set())
    else setSelected(new Set(data.items.map((i) => i.id)))
  }

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Approve, manage, and assign students to batches"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
            {selected.size > 0 && (
              <Button size="sm" onClick={bulkApprove} disabled={bulkLoading} className="bg-emerald-600 hover:bg-emerald-700">
                {bulkLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Bulk Approve ({selected.size})
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-4">
        <CardContent className="pt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, or phone…"
              className="pl-8"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState icon={Users} title="No students found" message="Try adjusting your filters or wait for new registrations." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><Checkbox checked={selected.size === data.items.length && data.items.length > 0} onCheckedChange={toggleSelectAll} aria-label="Select all" /></TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="hidden md:table-cell">Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Batches</TableHead>
                      <TableHead className="hidden lg:table-cell">Tests</TableHead>
                      <TableHead className="hidden md:table-cell">Registered</TableHead>
                      <TableHead className="hidden md:table-cell">Last Login</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell><Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} aria-label={`Select ${s.name}`} /></TableCell>
                        <TableCell>
                          <button onClick={() => setView({ name: 'admin/students/detail', id: s.id })} className="flex items-center gap-2 text-left hover:underline">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                              {s.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">{s.name}</div>
                              <div className="text-xs text-slate-500 truncate">{s.email}</div>
                            </div>
                          </button>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-slate-600">{s.phone || '—'}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-xs ${statusColor(s.status)}`}>{s.status}</Badge></TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{s.enrolledBatches}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{s.testAttempts}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-slate-500">{fmtDateTime(s.createdAt)}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-slate-500">{s.lastLoginAt ? fmtDateTime(s.lastLoginAt) : '—'}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setView({ name: 'admin/students/detail', id: s.id })}><Eye className="w-4 h-4 mr-2" /> View Profile</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {(s.status === 'PENDING' || s.status === 'REJECTED' || s.status === 'INACTIVE') && (
                                <DropdownMenuItem onClick={() => action(s, 'approve')} className="text-emerald-600"><Check className="w-4 h-4 mr-2" /> Approve</DropdownMenuItem>
                              )}
                              {(s.status === 'PENDING' || s.status === 'APPROVED' || s.status === 'INACTIVE') && (
                                <DropdownMenuItem onClick={() => setRejectFor(s)} className="text-rose-600"><X className="w-4 h-4 mr-2" /> Reject</DropdownMenuItem>
                              )}
                              {(s.status === 'ACTIVE' || s.status === 'APPROVED' || s.status === 'INACTIVE' || s.status === 'PENDING') && (
                                <DropdownMenuItem onClick={() => action(s, 'block')} className="text-rose-600"><Ban className="w-4 h-4 mr-2" /> Block</DropdownMenuItem>
                              )}
                              {s.status === 'BLOCKED' && (
                                <DropdownMenuItem onClick={() => action(s, 'unblock')} className="text-emerald-600"><RotateCcw className="w-4 h-4 mr-2" /> Unblock</DropdownMenuItem>
                              )}
                              {s.status === 'APPROVED' && (
                                <DropdownMenuItem onClick={() => action(s, 'activate')} className="text-emerald-600"><Check className="w-4 h-4 mr-2" /> Activate</DropdownMenuItem>
                              )}
                              {(s.status === 'ACTIVE' || s.status === 'APPROVED') && (
                                <DropdownMenuItem onClick={() => action(s, 'deactivate')} className="text-slate-600"><Ban className="w-4 h-4 mr-2" /> Deactivate</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t">
                  <div className="text-xs text-slate-500">
                    Showing {(data.page - 1) * data.pageSize + 1}-{Math.min(data.page * data.pageSize, data.total)} of {data.total}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" disabled={data.page >= data.totalPages} onClick={() => setPage(data.page + 1)}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <RejectDialog student={rejectFor} onClose={() => setRejectFor(null)} onConfirm={async (reason) => {
        if (rejectFor) await action(rejectFor, 'reject', { reason })
        setRejectFor(null)
      }} />
    </div>
  )
}

function RejectDialog({ student, onClose, onConfirm }: { student: Student | null; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  useEffect(() => { setReason('') }, [student])
  return (
    <AlertDialog open={!!student} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject student registration?</AlertDialogTitle>
          <AlertDialogDescription>
            {student ? `${student.name} (${student.email}) will be marked as rejected. They will not be able to access learning content.` : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input placeholder="Optional: reason for rejection" value={reason} onChange={(e) => setReason(e.target.value)} />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(reason)} className="bg-rose-600 hover:bg-rose-700">Reject</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function debounce<TArgs extends unknown[]>(fn: (...args: TArgs) => void, delay: number): (...args: TArgs) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined
  return (...args: TArgs) => {
    if (timeout !== undefined) clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

async function fetchWithToken(url: string) {
  const token = window.localStorage.getItem('edulearn_access_token')
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) { toast.error('Export failed'); return }
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = url.includes('students') ? 'students.csv' : 'export.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}
