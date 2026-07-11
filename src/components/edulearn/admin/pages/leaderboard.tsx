'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { useToastAction, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trophy, Loader2 } from 'lucide-react'

export function AdminLeaderboard() {
  const toastAction = useToastAction()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ leaderboard: any[] }>('/api/admin/leaderboard')
      .then((d) => setData(d.leaderboard))
      .catch((e) => toastAction.error(e))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader title="Leaderboard" subtitle="Rank students by best-attempt-per-test average score" />
      <Card><CardContent className="p-0">
        {loading ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div> : data.length === 0 ? <EmptyState icon={Trophy} title="No results yet" message="Leaderboard will populate once students submit test attempts." /> : (
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow>
              <TableHead>Rank</TableHead><TableHead>Student</TableHead><TableHead className="hidden md:table-cell">Tests</TableHead><TableHead className="hidden md:table-cell">Attempts</TableHead><TableHead>Avg</TableHead><TableHead>Best</TableHead><TableHead className="hidden lg:table-cell">Total Time</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.userId} className={row.rank <= 3 ? 'bg-amber-50/50' : ''}>
                  <TableCell>{row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}</TableCell>
                  <TableCell><div className="font-medium">{row.name}</div></TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{row.testsTaken}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{row.totalAttempts}</TableCell>
                  <TableCell><Badge variant="outline">{row.avgScore}%</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="bg-emerald-50 text-emerald-700">{row.bestScore}%</Badge></TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-slate-500">{Math.round(row.totalTime / 60)}m</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        )}
      </CardContent></Card>
    </div>
  )
}
