'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useApp } from '@/stores/app-store'
import { api, ApiError } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ArrowLeft, Clock, AlertCircle, Loader2, Send, CheckCircle2, XCircle, Award } from 'lucide-react'
import { toast } from 'sonner'

interface StartResp {
  attempt: { id: string; attemptNumber: number; startedAt: string; expiresAt: string; durationMins: number; remainingSecs: number }
  test: { id: string; title: string; instructions?: string | null; durationMins: number; showResultImmediately: boolean; passingPct?: number | null }
  questions: { id: string; text: string; marks: number; order: number; options: { id: string; text: string; order: number }[] }[]
  savedAnswers: Record<string, string | null>
  savedAnswerRevisions: Record<string, number>
  resumed: boolean
}

interface SubmitResp {
  alreadySubmitted?: boolean
  attempt: { id: string; attemptNumber: number; score: number; totalMarks: number; percentage: number; timeTakenSecs: number; submissionType: string; submittedAt: string; passed: boolean | null }
  test: { id: string; title: string; showAnswerKey: boolean; showResultImmediately: boolean; passingPct?: number | null }
  questions: { id: string; text: string; marks: number; selectedOptionId: string | null; answered: boolean; isCorrect?: boolean; marksAwarded?: number; explanation?: string | null; correctOptionId?: string | null; options?: { id: string; text: string; isCorrect?: boolean }[] }[]
}

export function StudentTakeTest({ id }: { id: string }) {
  const { setView } = useApp()
  const [data, setData] = useState<StartResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string | null>>({})
  const [remainingSecs, setRemainingSecs] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResp | null>(null)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'failed'>('saved')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const autosaveRef = useRef<NodeJS.Timeout | null>(null)
  const inFlightAutosaveRef = useRef<Promise<boolean> | null>(null)
  const answersRef = useRef<Record<string, string | null>>({})
  const submittingRef = useRef(false)
  const answerRevisionRef = useRef<Record<string, number>>({})
  const dataRef = useRef<StartResp | null>(null)
  const resultRef = useRef<SubmitResp | null>(null)

  const startTest = useCallback(async () => {
    setStarting(true)
    setError(null)
    try {
      const res = await api.post<StartResp>(`/api/student/tests/${id}/start`)
      setData(res)
      dataRef.current = res
      setRemainingSecs(res.attempt.remainingSecs)
      // Initialize answers from saved answers (resume support)
      if (res.savedAnswers && Object.keys(res.savedAnswers).length > 0) {
        answersRef.current = { ...res.savedAnswers }
        answerRevisionRef.current = { ...res.savedAnswerRevisions }
        setAnswers({ ...res.savedAnswers })
      }
    } catch (e) {
      if (e instanceof ApiError) setError(e.message)
      else setError('Failed to start test')
    } finally { setStarting(false); setLoading(false) }
  }, [id])

  useEffect(() => {
    void startTest()
  }, [startTest])

  const submit = useCallback(async (submissionType: 'MANUAL' | 'AUTO_TIMEOUT' = 'MANUAL') => {
    const currentData = dataRef.current
    if (!currentData || submittingRef.current) return
    submittingRef.current = true
    if (autosaveRef.current) {
      clearTimeout(autosaveRef.current)
      autosaveRef.current = null
    }
    const answerSnapshot = { ...answersRef.current }
    const revisionSnapshot = { ...answerRevisionRef.current }
    setSubmitting(true)
    setConfirmSubmit(false)
    try {
      await inFlightAutosaveRef.current
      const answersArr = Object.entries(answerSnapshot).map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId: selectedOptionId || null, revision: revisionSnapshot[questionId] || 0 }))
      const res = await api.post<SubmitResp>(`/api/student/attempts/${currentData.attempt.id}`, { answers: answersArr, submissionType, finalize: true })
      setResult(res)
      resultRef.current = res
      toast.success(res.alreadySubmitted ? 'Test was already submitted.' : submissionType === 'AUTO_TIMEOUT' ? 'Time expired. Test auto-submitted.' : 'Test submitted successfully!')
    } catch (e) {
      submittingRef.current = false
      if (e instanceof ApiError) toast.error(e.message)
      else toast.error('Submission failed')
    } finally { setSubmitting(false) }
  }, [])

  const saveDraft = useCallback(async (showToast = true) => {
    const currentData = dataRef.current
    if (!currentData || submittingRef.current) return false
    const answerSnapshot = { ...answersRef.current }
    const revisionSnapshot = { ...answerRevisionRef.current }
    setSaveStatus('saving')
    const previousSave = inFlightAutosaveRef.current
    const savePromise = (async () => {
      if (previousSave) await previousSave
      if (submittingRef.current) return false
      try {
        const answersArr = Object.entries(answerSnapshot).map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId: selectedOptionId || null, revision: revisionSnapshot[questionId] || 0 }))
        await api.post(`/api/student/attempts/${currentData.attempt.id}`, { answers: answersArr, submissionType: 'MANUAL', finalize: false })
        setSaveStatus('saved')
        if (showToast) toast.success('Answers saved')
        return true
      } catch (e) {
        setSaveStatus('failed')
        if (showToast) {
          if (e instanceof ApiError) toast.error(e.message)
          else toast.error('Save failed')
        }
        return false
      }
    })()
    inFlightAutosaveRef.current = savePromise
    try {
      return await savePromise
    } finally {
      if (inFlightAutosaveRef.current === savePromise) inFlightAutosaveRef.current = null
    }
  }, [])

  const selectAnswer = (questionId: string, optionId: string) => {
    if (submittingRef.current) return
    answerRevisionRef.current[questionId] = (answerRevisionRef.current[questionId] || 0) + 1
    const next = { ...answersRef.current, [questionId]: optionId }
    answersRef.current = next
    setAnswers(next)
    setSaveStatus('unsaved')
  }

  useEffect(() => {
    if (!data || result || saveStatus !== 'unsaved') return
    if (autosaveRef.current) clearTimeout(autosaveRef.current)
    autosaveRef.current = setTimeout(() => { void saveDraft(false) }, 300)
    return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current) }
  }, [answers, data, result, saveDraft, saveStatus])

  const exitTest = useCallback(async () => {
    if (!dataRef.current) return
    if (!confirm('Leave the test? Your current answers will be saved and you can resume later.')) return
    const saved = await saveDraft()
    if (saved) {
      setView({ name: 'student/tests' })
    }
  }, [saveDraft, setView])

  // Countdown timer — uses refs for submit/saveDraft to avoid stale closures
  useEffect(() => {
    if (!data || result) return
    intervalRef.current = setInterval(() => {
      setRemainingSecs((s) => {
        if (s <= 1) {
          // Auto-submit on expiry
          if (intervalRef.current) clearInterval(intervalRef.current)
          void submit('AUTO_TIMEOUT')
          return 0
        }
        // Auto-save when 2 seconds remain with unsaved changes
        if (s <= 3) void saveDraft(false)
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [data, result, saveDraft, submit])

  // Warn before leaving
  useEffect(() => {
    if (!data || result) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [data, result])

  if (loading || starting) return <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /><div className="text-sm text-slate-500 mt-2">{starting ? 'Starting test…' : 'Loading…'}</div></div>

  if (error) return (
    <div className="max-w-md mx-auto mt-12">
      <Card><CardContent className="pt-6 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-rose-500 mb-3" />
        <h2 className="text-xl font-bold mb-2">Cannot start test</h2>
        <p className="text-sm text-slate-600 mb-4">{error}</p>
        <Button onClick={() => setView({ name: 'student/tests' })}>Back to Tests</Button>
      </CardContent></Card>
    </div>
  )

  if (result) return <ResultView result={result} onBack={() => setView({ name: 'student/tests' })} onViewResults={() => setView({ name: 'student/results' })} />

  if (!data) return null

  const answeredCount = Object.values(answers).filter((v) => v).length
  const totalQ = data.questions.length
  const mins = Math.floor(remainingSecs / 60)
  const secs = remainingSecs % 60
  const lowTime = remainingSecs < 60

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={exitTest} className="mb-3"><ArrowLeft className="w-4 h-4 mr-1" /> Exit (saves progress)</Button>

      {/* Sticky timer bar */}
      <Card className={`mb-4 sticky top-16 z-20 ${lowTime ? 'border-rose-300 bg-rose-50' : ''}`}>
        <CardContent className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-sm sm:text-base">{data.test.title}</h1>
            <Badge variant="outline">Attempt #{data.attempt.attemptNumber}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className={saveStatus === 'failed' ? 'text-xs text-rose-600' : 'text-xs text-slate-500'}>
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved changes' : saveStatus === 'failed' ? 'Save failed - retry required' : 'Saved'}
            </div>
            <div className="text-xs text-slate-500 hidden sm:block">{answeredCount}/{totalQ} answered</div>
            <div className={`flex items-center gap-1 font-mono font-bold text-lg ${lowTime ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
              <Clock className="w-4 h-4" />
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
          </div>
        </CardContent>
      </Card>

      {data.test.instructions && (
        <Card className="mb-4 bg-blue-50 border-blue-200"><CardContent className="pt-4 text-sm text-blue-900"><strong>Instructions:</strong> {data.test.instructions}</CardContent></Card>
      )}

      <div className="space-y-4 mb-6">
        {data.questions.map((q, i) => (
          <Card key={q.id}><CardContent className="pt-4">
            <div className="flex items-start gap-2 mb-3">
              <Badge variant="outline" className="mt-0.5">Q{i + 1}</Badge>
              <div className="flex-1">
                <div className="font-medium">{q.text}</div>
                <div className="text-xs text-slate-400 mt-0.5">{q.marks} mark(s)</div>
              </div>
            </div>
            <RadioGroup value={answers[q.id] || ''} onValueChange={(v) => selectAnswer(q.id, v)} disabled={submitting}>
              <div className="space-y-2">
                {q.options.map((o, idx) => (
                  <label key={o.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-slate-50 ${answers[q.id] === o.id ? 'border-blue-500 bg-blue-50' : ''}`}>
                    <RadioGroupItem value={o.id} id={`${q.id}-${o.id}`} />
                    <Label htmlFor={`${q.id}-${o.id}`} className="cursor-pointer flex-1">{String.fromCharCode(65 + idx)}. {o.text}</Label>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </CardContent></Card>
        ))}
      </div>

      <div className="sticky bottom-0 bg-white border-t p-3 flex items-center justify-between">
        <Button variant="outline" onClick={() => { void saveDraft() }} disabled={submitting}>Save Progress</Button>
        <Button onClick={() => setConfirmSubmit(true)} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
          {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
          Submit Test ({answeredCount}/{totalQ})
        </Button>
      </div>

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit test?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} of {totalQ} questions. {answeredCount < totalQ && `${totalQ - answeredCount} will be marked as unanswered. `}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submit('MANUAL')} className="bg-emerald-600 hover:bg-emerald-700">Submit now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ResultView({ result, onBack, onViewResults }: { result: SubmitResp; onBack: () => void; onViewResults: () => void }) {
  const a = result.attempt
  const showResult = result.test.showResultImmediately

  return (
    <div>
      <Card className={`mb-4 ${a.passed === false ? 'border-rose-300' : a.passed === true ? 'border-emerald-300' : ''}`}>
        <CardContent className="pt-6 text-center">
          {showResult ? (
            <>
              <div className={`inline-flex w-16 h-16 rounded-full items-center justify-center mb-3 ${a.passed === false ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {a.passed === false ? <XCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
              </div>
              <h1 className="text-2xl font-bold">{a.percentage}%</h1>
              <p className="text-sm text-slate-600 mt-1">Score: {a.score}/{a.totalMarks} · {a.passed === true ? 'Passed' : a.passed === false ? 'Failed' : 'Submitted'}</p>
              <div className="text-xs text-slate-500 mt-2">Time taken: {Math.floor(a.timeTakenSecs / 60)}m {a.timeTakenSecs % 60}s · Submission: {a.submissionType}</div>
            </>
          ) : (
            <>
              <Award className="w-12 h-12 mx-auto text-blue-600 mb-3" />
              <h1 className="text-2xl font-bold">Test submitted!</h1>
              <p className="text-sm text-slate-600 mt-1">Your results will be published by the admin.</p>
            </>
          )}
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" onClick={onBack}>Back to Tests</Button>
            {showResult && <Button onClick={onViewResults}>View All Results</Button>}
          </div>
        </CardContent>
      </Card>

      {showResult && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Answer Review</h2>
          {result.questions.map((q, i) => (
            <Card key={q.id} className={q.isCorrect === false ? 'border-rose-200' : q.isCorrect === true ? 'border-emerald-200' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-2 mb-2">
                  <Badge variant="outline">Q{i + 1}</Badge>
                  <div className="flex-1"><div className="font-medium">{q.text}</div><div className="text-xs text-slate-400">{q.marks} mark(s) · {q.isCorrect ? `+${q.marksAwarded}` : '0'} awarded</div></div>
                  {q.isCorrect === true && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {q.isCorrect === false && <XCircle className="w-5 h-5 text-rose-600" />}
                </div>
                {q.options && q.options.map((o, idx) => {
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
      )}
    </div>
  )
}
