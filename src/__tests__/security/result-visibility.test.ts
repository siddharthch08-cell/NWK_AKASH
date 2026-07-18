import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Result Visibility Security', () => {
  const resultService = fs.readFileSync(path.join(__dirname, '../../domain/result.ts'), 'utf-8')
  const resultRoute = fs.readFileSync(path.join(__dirname, '../../app/api/student/results/[id]/route.ts'), 'utf-8')
  const resultsListRoute = fs.readFileSync(path.join(__dirname, '../../app/api/student/results/route.ts'), 'utf-8')

  it('hidden detail DTO omits all score fields', () => {
    const hiddenBranch = resultService.slice(resultService.indexOf('if (!published)'), resultService.indexOf('const showKey'))
    expect(hiddenBranch).toContain('resultPublished: false')
    expect(hiddenBranch).toContain('questions: []')
    expect(hiddenBranch).not.toContain('score:')
    expect(hiddenBranch).not.toContain('percentage:')
  })

  it('detail route delegates visibility and serialization to the result owner', () => {
    expect(resultRoute).toContain('ResultService.getStudentResult')
    expect(resultRoute).not.toContain('db.testAttempt')
  })

  it('published result DTO includes score fields', () => {
    expect(resultService).toContain('score: attempt.score')
    expect(resultService).toContain('totalMarks: attempt.totalMarks')
    expect(resultService).toContain('percentage: attempt.percentage')
  })

  it('list statistics use only published attempts', () => {
    expect(resultsListRoute).toContain('ResultService.getStudentResults')
    expect(resultService).toContain('const published = attempts.filter(attempt => !!attempt.resultPublishedAt)')
    expect(resultService).toContain('score: null, totalMarks: null, percentage: null, timeTakenSecs: null')
  })
})
