'use client'

import { useApp } from '@/stores/app-store'
import { useApi } from '../../shared/admin-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { fmtDateTime } from '@/lib/format'

export function StudentResultDetail({ id }: { id: string }) {
  const { setView } = useApp()
  const { data, loading } = useApi<any>(`/api/student/results/${id}`)

  if (loading) return <div className="text-center py-12 text-slate-500">Loading…</div>
  if (!data) return null
  const a = data.attempt
  const showKey = data.test.showAnswerKey

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => setView({ name: 'student/results' })} className="mb-3"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Results</Button>

      <Card className={`mb-4 ${a.passed === false ? 'border-rose-300' : 'border-emerald-300'}`}>
        <CardContent className="pt-6 text-center">
          <div className={`inline-flex w-16 h-16 rounded-full items-center justify-center mb-3 ${a.passed === false ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {a.passed === false ? <XCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>
          <h1 className="text-3xl font-bold">{a.percentage}%</h1>
          <p className="text-sm text-slate-600 mt-1">{data.test.title}</p>
          <div className="grid grid-cols-3 gap-2 mt-4 max-w-md mx-auto">
            <div><div className="text-lg font-bold">{a.score}</div><div className="text-xs text-slate-500">Score</div></div>
            <div><div className="text-lg font-bold">{a.totalMarks}</div><div className="text-xs text-slate-500">Total</div></div>
            <div><div className="text-lg font-bold">{Math.floor(a.timeTakenSecs / 60)}m</div><div className="text-xs text-slate-500">Time</div></div>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> Submitted {fmtDateTime(a.submittedAt)}</div>
        </CardContent>
      </Card>

      {showKey && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Answer Review</h2>
          <div className="space-y-3">
            {data.questions.map((q: any, i: number) => (
              <Card key={q.id} className={q.isCorrect === false ? 'border-rose-200' : 'border-emerald-200'}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2 mb-2">
                    <Badge variant="outline">Q{i + 1}</Badge>
                    <div className="flex-1"><div className="font-medium">{q.text}</div><div className="text-xs text-slate-400">{q.marks} mark(s) · {q.isCorrect ? `+${q.marksAwarded}` : '0'} awarded</div></div>
                    {q.isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
                  </div>
                  {q.options && q.options.map((o: any, idx: number) => {
                    const isSelected = q.selectedOptionId === o.id
                    const isCorrect = o.isCorrect
                    return (
                      <div key={o.id} className={`flex items-center gap-2 p-2 rounded text-sm ${isCorrect ? 'bg-emerald-50 text-emerald-800' : isSelected ? 'bg-rose-50 text-rose-800' : ''}`}>
                        <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">{String.fromCharCode(65 + idx)}</span>
                        <span className="flex-1">{o.text}</span>
                        {isCorrect && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Correct</Badge>}
                        {isSelected && !isCorrect && <Badge className="bg-rose-100 text-rose-700 text-xs">Your answer</Badge>}
                      </div>
                    )
                  })}
                  {q.explanation && <div className="mt-2 text-xs text-slate-600 italic bg-slate-50 p-2 rounded">Explanation: {q.explanation}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
