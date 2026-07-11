import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { questionSchema } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const test = await db.test.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
    },
  })
  if (!test) return notFound('Test not found')
  return ok({ questions: test.questions }, 'Questions list')
}

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = questionSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const test = await db.test.findUnique({
    where: { id },
    include: { _count: { select: { questions: true } } },
  })
  if (!test) return notFound('Test not found')

  // CRITICAL: enforce max-questions backend limit (default 20)
  if (test._count.questions >= test.maxQuestions) {
    return fail(
      'QUESTION_LIMIT_REACHED',
      `This test already has the maximum of ${test.maxQuestions} questions`,
      400
    )
  }

  const maxOrder = await db.question.aggregate({ where: { testId: id }, _max: { order: true } })
  const order = parsed.data.order ?? (maxOrder._max.order ?? -1) + 1

  const question = await db.question.create({
    data: {
      testId: id,
      text: parsed.data.text,
      explanation: parsed.data.explanation || null,
      marks: parsed.data.marks,
      order,
      options: {
        create: parsed.data.options.map((o, idx) => ({
          text: o.text,
          isCorrect: o.isCorrect,
          order: idx,
        })),
      },
    },
    include: { options: true },
  })

  return ok({ question }, 'Question created', undefined, 201)
}
