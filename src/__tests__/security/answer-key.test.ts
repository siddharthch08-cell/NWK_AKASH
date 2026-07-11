import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Answer-Key Leakage Prevention', () => {
  const attemptRoute = fs.readFileSync(path.join(__dirname, '../../app/api/student/attempts/[id]/route.ts'), 'utf-8')
  const resultRoute = fs.readFileSync(path.join(__dirname, '../../app/api/student/results/[id]/route.ts'), 'utf-8')
  const resultService = fs.readFileSync(path.join(__dirname, '../../domain/result.ts'), 'utf-8')

  it('all submitted attempt and result responses use one serializer', () => {
    expect(attemptRoute).toContain('ResultService.getStudentResult')
    expect(resultRoute).toContain('ResultService.getStudentResult')
    expect(attemptRoute).not.toContain('correctOptionId')
    expect(resultRoute).not.toContain('correctOptionId')
  })

  it('returns no questions while result publication is hidden', () => {
    expect(resultService).toContain('if (!published)')
    expect(resultService).toContain('resultPublished: false')
    expect(resultService).toContain('questions: []')
    expect(resultService).toContain('hidden: true')
  })

  it('includes correct-option fields only inside the showAnswerKey branch', () => {
    expect(resultService).toContain('const showKey = attempt.test.showAnswerKey')
    expect(resultService).toContain('if (showKey)')
    expect(resultService).toContain('correctOptionId')
    expect(resultService).toContain('isCorrect: o.isCorrect')
  })

  it('attempt start never exposes correct answers', () => {
    const startRoute = fs.readFileSync(path.join(__dirname, '../../app/api/student/tests/[id]/start/route.ts'), 'utf-8')
    expect(startRoute).toContain('options: q.options.map((o) => ({ id: o.id, text: o.text, order: o.order }))')
    expect(startRoute).not.toContain('isCorrect: o.isCorrect')
  })
})
