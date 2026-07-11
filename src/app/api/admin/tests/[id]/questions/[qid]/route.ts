import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { questionSchema } from '@/lib/validation'

type Params = { params: Promise<{ id: string; qid: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id, qid } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = questionSchema.partial().safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const question = await db.question.findFirst({ where: { id: qid, testId: id } })
  if (!question) return notFound('Question not found')

  // If options are being updated, replace them entirely
  if (parsed.data.options) {
    await db.$transaction([
      db.questionOption.deleteMany({ where: { questionId: qid } }),
      db.questionOption.createMany({
        data: parsed.data.options.map((o, idx) => ({
          questionId: qid,
          text: o.text,
          isCorrect: o.isCorrect,
          order: idx,
        })),
      }),
    ])
  }

  const updated = await db.question.update({
    where: { id: qid },
    data: {
      text: parsed.data.text ?? question.text,
      explanation: parsed.data.explanation ?? question.explanation,
      marks: parsed.data.marks ?? question.marks,
      order: parsed.data.order ?? question.order,
    },
    include: { options: { orderBy: { order: 'asc' } } },
  })
  return ok({ question: updated }, 'Question updated')
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id, qid } = await params

  const question = await db.question.findFirst({ where: { id: qid, testId: id } })
  if (!question) return notFound('Question not found')

  // Block deletion if there are submitted attempts that reference this question
  const answersCount = await db.attemptAnswer.count({ where: { questionId: qid } })
  if (answersCount > 0) {
    return fail('CONFLICT', 'Cannot delete a question that has been answered in submitted attempts', 409)
  }

  await db.question.delete({ where: { id: qid } })
  return ok({}, 'Question deleted')
}
