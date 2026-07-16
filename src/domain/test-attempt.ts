import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { finalizeAttempt } from '@/lib/test-engine'
import { canAccessAttempt, canAccessTest } from './student-access'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from './errors'

type AnswerInput = { questionId: string; selectedOptionId: string | null; revision?: number }
type QuestionWithOptions = { id: string; order: number; options: Array<{ id: string; order: number }> }

function hashSeed(value: string) {
  let hash = 2166136261
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

function shuffled<T extends { id: string }>(items: T[], seed: string) {
  const result = [...items]
  let state = hashSeed(seed) || 1
  for (let index = result.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const target = state % (index + 1)
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function buildOrders(test: { shuffleQuestions: boolean; shuffleOptions: boolean; maxQuestions: number; questions: QuestionWithOptions[] }, attemptId: string) {
  const standardQuestions = [...test.questions].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const questions = (test.shuffleQuestions ? shuffled(standardQuestions, `${attemptId}:questions`) : standardQuestions).slice(0, test.maxQuestions)
  const optionOrder: Record<string, string[]> = {}
  for (const question of questions) {
    const standardOptions = [...question.options].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    optionOrder[question.id] = (test.shuffleOptions ? shuffled(standardOptions, `${attemptId}:${question.id}:options`) : standardOptions).map(option => option.id)
  }
  return { questionOrder: questions.map(question => question.id), optionOrder }
}

function applyOrders<T extends { id: string; options: Array<{ id: string }> }>(questions: T[], questionOrder: string | null, optionOrder: string | null) {
  const questionIds: string[] = questionOrder ? JSON.parse(questionOrder) : questions.map(question => question.id)
  const optionIds: Record<string, string[]> = optionOrder ? JSON.parse(optionOrder) : {}
  const byQuestion = new Map(questions.map(question => [question.id, question]))
  return questionIds.flatMap(id => {
    const question = byQuestion.get(id)
    if (!question) return []
    const byOption = new Map(question.options.map(option => [option.id, option]))
    const orderedOptions = (optionIds[id] || question.options.map(option => option.id)).flatMap(optionId => {
      const option = byOption.get(optionId)
      return option ? [option] : []
    })
    return [{ ...question, options: orderedOptions }]
  })
}

export async function startAttempt(testId: string, userId: string) {
  const access = await canAccessTest(userId, testId)
  if (!access.allowed) throw new ForbiddenError(access.reason)
  const now = new Date()
  const test = await db.test.findUnique({
    where: { id: testId },
    include: { questions: { orderBy: [{ order: 'asc' }, { id: 'asc' }], include: { options: { orderBy: [{ order: 'asc' }, { id: 'asc' }] } } } },
  })
  if (!test) throw new NotFoundError(testId, 'Test')
  if (!test.questions.length) throw new ValidationError('This test has no questions')

  const expired = await db.testAttempt.findFirst({ where: { testId, userId, status: 'IN_PROGRESS', expiresAt: { lte: now } }, select: { id: true } })
  if (expired) await finalizeAttempt(expired.id, 'AUTO_TIMEOUT', userId)

  try {
    const result = await db.$transaction(async tx => {
      await tx.$executeRaw`UPDATE "Test" SET "updatedAt" = "updatedAt" WHERE "id" = ${testId}`
      const existing = await tx.testAttempt.findFirst({ where: { testId, userId, status: 'IN_PROGRESS', expiresAt: { gt: now } } })
      if (existing) return { action: 'resume' as const, attempt: existing }
      const attempts = await tx.testAttempt.findMany({ where: { testId, userId }, select: { attemptNumber: true } })
      if (attempts.length >= test.maxAttempts) throw new ConflictError(`You have used all ${test.maxAttempts} attempt(s) for this test`)
      const attemptNumber = attempts.reduce((max, attempt) => Math.max(max, attempt.attemptNumber), 0) + 1
      const id = randomUUID()
      const orders = buildOrders(test, id)
      const attempt = await tx.testAttempt.create({
        data: {
          id, testId, userId, attemptNumber, startedAt: now,
          expiresAt: new Date(now.getTime() + test.durationMins * 60_000), status: 'IN_PROGRESS',
          totalMarks: test.questions.filter(question => orders.questionOrder.includes(question.id)).reduce((sum, question) => sum + question.marks, 0),
          questionOrder: JSON.stringify(orders.questionOrder), optionOrder: JSON.stringify(orders.optionOrder),
        },
      })
      return { action: 'created' as const, attempt }
    })
    return { ...result, test: { ...test, questions: applyOrders(test.questions, result.attempt.questionOrder, result.attempt.optionOrder) } }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await db.testAttempt.findFirst({ where: { testId, userId, status: 'IN_PROGRESS' } })
      if (existing) return { action: 'resume' as const, attempt: existing, test: { ...test, questions: applyOrders(test.questions, existing.questionOrder, existing.optionOrder) } }
    }
    throw error
  }
}

export async function saveAnswers(attemptId: string, userId: string, answers: AnswerInput[]) {
  const ownership = await canAccessAttempt(userId, attemptId)
  if (!ownership.allowed) throw new ForbiddenError(ownership.reason)
  const uniqueAnswers = new Map<string, AnswerInput>()
  for (const answer of answers) {
    const current = uniqueAnswers.get(answer.questionId)
    if (!current || (answer.revision ?? 0) >= (current.revision ?? 0)) uniqueAnswers.set(answer.questionId, answer)
  }
  return db.$transaction(async tx => {
    await tx.$executeRaw`UPDATE "TestAttempt" SET "score" = "score" WHERE "id" = ${attemptId}`
    const attempt = await tx.testAttempt.findUnique({ where: { id: attemptId } })
    if (!attempt) throw new NotFoundError(attemptId, 'Attempt')
    if (attempt.status !== 'IN_PROGRESS') return { saved: false, alreadySubmitted: true }
    if (attempt.expiresAt <= new Date()) throw new ValidationError('Attempt has expired; server-persisted answers will be finalized')
    const allowedQuestions: string[] = attempt.questionOrder ? JSON.parse(attempt.questionOrder) : []
    const questions = await tx.question.findMany({
      where: { testId: attempt.testId, ...(allowedQuestions.length ? { id: { in: allowedQuestions } } : {}) },
      select: { id: true, options: { select: { id: true } } },
    })
    const valid = new Map(questions.map(question => [question.id, new Set(question.options.map(option => option.id))]))
    for (const answer of uniqueAnswers.values()) {
      const options = valid.get(answer.questionId)
      if (!options) throw new ValidationError(`Unknown questionId: ${answer.questionId}`)
      if (answer.selectedOptionId && !options.has(answer.selectedOptionId)) throw new ValidationError(`Option does not belong to question ${answer.questionId}`)
      const existingAnswer = await tx.attemptAnswer.findUnique({ where: { attemptId_questionId: { attemptId, questionId: answer.questionId } }, select: { revision: true } })
      const revision = answer.revision ?? 0
      if (existingAnswer && revision < existingAnswer.revision) continue
      await tx.attemptAnswer.upsert({
        where: { attemptId_questionId: { attemptId, questionId: answer.questionId } },
        create: { attemptId, questionId: answer.questionId, selectedOptionId: answer.selectedOptionId, revision },
        update: { selectedOptionId: answer.selectedOptionId, revision, isCorrect: false, marksAwarded: 0 },
      })
    }
    return { saved: true, savedCount: uniqueAnswers.size }
  })
}

export async function submitAttempt(attemptId: string, userId: string, answers: AnswerInput[], submissionType: 'MANUAL' | 'AUTO_TIMEOUT' = 'MANUAL') {
  const attempt = await db.testAttempt.findUnique({ where: { id: attemptId } })
  if (!attempt) throw new NotFoundError(attemptId, 'Attempt')
  if (attempt.userId !== userId) throw new ForbiddenError('This is not your attempt')
  if (attempt.status === 'SUBMITTED') return { alreadySubmitted: true, attempt }
  if (answers.length && attempt.expiresAt > new Date()) await saveAnswers(attemptId, userId, answers)
  const finalType = attempt.expiresAt <= new Date() ? 'AUTO_TIMEOUT' : submissionType
  const finalized = await finalizeAttempt(attemptId, finalType, userId)
  return { finalized, attempt: finalized }
}

export async function getAttempt(attemptId: string, userId: string) {
  const ownership = await canAccessAttempt(userId, attemptId)
  if (!ownership.allowed) throw new ForbiddenError(ownership.reason)
  const attempt = await db.testAttempt.findUnique({ where: { id: attemptId }, include: { test: { include: { questions: { include: { options: true } } } }, answers: true } })
  if (!attempt) throw new NotFoundError(attemptId, 'Attempt')
  if (attempt.status === 'IN_PROGRESS' && attempt.expiresAt <= new Date()) {
    await finalizeAttempt(attemptId, 'AUTO_TIMEOUT', userId)
    return getAttempt(attemptId, userId)
  }
  return { ...attempt, test: { ...attempt.test, questions: applyOrders(attempt.test.questions, attempt.questionOrder, attempt.optionOrder) } }
}
