'use client'

import { useApp } from '@/stores/app-store'
import { useApi, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy } from 'lucide-react'
import type { LeaderboardEntry } from '@/domain/types'

export function StudentLeaderboard() {
  const { user } = useApp()
  const { data, loading } = useApi<{ leaderboard: LeaderboardEntry[]; myRank: number | null }>('/api/student/leaderboard')

  if (loading) return <div className="text-center py-12 text-slate-500">Loading…</div>
  if (!data || data.leaderboard.length === 0) return <EmptyState icon={Trophy} title="No rankings yet" message="The leaderboard will populate once students submit test attempts." />

  return (
    <div>
      <PageHeader title="Leaderboard" subtitle="Best-attempt-per-test average ranking across your batches" />
      {data.myRank && (
        <Card className="mb-4 bg-gradient-to-r from-blue-50 to-teal-50 border-blue-200"><CardContent className="pt-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-500">Your current rank</div><div className="text-2xl font-bold text-blue-700">#{data.myRank}</div></div>
          <Trophy className="w-10 h-10 text-amber-500" />
        </CardContent></Card>
      )}
      <Card><CardContent className="p-0">
        <div className="divide-y">
          {data.leaderboard.map((row) => {
            const isMe = row.userId === user?.id
            return (
              <div key={row.userId} className={`flex items-center gap-3 p-3 ${isMe ? 'bg-blue-50' : ''}`}>
                <div className="w-10 text-center font-bold">{row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}</div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white font-semibold text-xs">{row.name.charAt(0)}</div>
                <div className="flex-1"><div className="font-medium text-sm">{row.name} {isMe && <Badge variant="outline" className="ml-1 text-xs bg-blue-100">You</Badge>}</div><div className="text-xs text-slate-500">{row.testsTaken} tests · {row.totalAttempts} attempts</div></div>
                <div className="text-right"><div className="font-bold">{row.avgScore}%</div><div className="text-xs text-slate-500">avg · best {row.bestScore}%</div></div>
              </div>
            )
          })}
        </div>
      </CardContent></Card>
    </div>
  )
}
