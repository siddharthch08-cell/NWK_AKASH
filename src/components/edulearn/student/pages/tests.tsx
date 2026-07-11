'use client'

import { useApp } from '@/stores/app-store'
import { useApi, PageHeader, EmptyState } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileQuestion, Clock, Calendar, Play, CheckCircle2, Lock, AlertCircle } from 'lucide-react'
import { fmtDateTime } from '@/lib/format'

export function StudentTests() {
  const { setView } = useApp()
  const { data, loading } = useApi<any>('/api/student/tests')

  if (loading) return <div className="text-center py-12 text-slate-500">Loading…</div>
  if (!data) return null

  const sections = [
    { key: 'active', label: 'Active Tests', icon: Play, color: 'text-emerald-600', tests: data.active || [] },
    { key: 'upcoming', label: 'Upcoming', icon: Clock, color: 'text-sky-600', tests: data.upcoming || [] },
    { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-blue-600', tests: data.completed || [] },
    { key: 'attemptLimitReached', label: 'Attempt Limit Reached', icon: Lock, color: 'text-slate-500', tests: data.attemptLimitReached || [] },
    { key: 'expired', label: 'Expired', icon: AlertCircle, color: 'text-rose-600', tests: data.expired || [] },
  ]

  return (
    <div>
      <PageHeader title="Tests & Assessments" subtitle="Timed MCQ quizzes assigned to your batches" />
      {sections.every((s) => s.tests.length === 0) ? (
        <EmptyState icon={FileQuestion} title="No tests available" message="Tests assigned to your batches will appear here." />
      ) : (
        <div className="space-y-6">
          {sections.filter((s) => s.tests.length > 0).map((section) => (
            <div key={section.key}>
              <h2 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${section.color}`}><section.icon className="w-4 h-4" /> {section.label} ({section.tests.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.tests.map((t: any) => (
                  <Card key={t.id}><CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{t.title}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{t.description || ''}</p>
                      </div>
                      {t.lastAttempt && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-xs">{t.lastAttempt.percentage}%</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-600">
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t.durationMins} min</div>
                      <div className="flex items-center gap-1"><FileQuestion className="w-3 h-3" /> {t.questionCount} Q</div>
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {t.startAt ? fmtDateTime(t.startAt) : 'Open'}</div>
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {t.endAt ? fmtDateTime(t.endAt) : 'No deadline'}</div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">Attempts: {t.attemptsUsed}/{t.maxAttempts} · {t.attemptsRemaining} remaining</div>
                    <div className="mt-3 flex gap-2">
                      {section.key === 'active' && t.attemptsRemaining > 0 && (
                        <Button size="sm" className="flex-1 bg-blue-700 hover:bg-blue-800" onClick={() => setView({ name: 'student/tests/take', id: t.id })}>
                          <Play className="w-3 h-3 mr-1" /> {t.inProgressAttempt ? 'Resume' : 'Start Test'}
                        </Button>
                      )}
                      {section.key === 'completed' && (
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setView({ name: 'student/results' })}>View Results</Button>
                      )}
                      {section.key === 'attemptLimitReached' && (
                        <Button size="sm" variant="outline" className="flex-1" disabled><Lock className="w-3 h-3 mr-1" /> Limit reached</Button>
                      )}
                      {section.key === 'expired' && (
                        <Button size="sm" variant="outline" className="flex-1" disabled>Expired</Button>
                      )}
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
