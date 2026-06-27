import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, fromZodError, unauthorized, fail, parsePagination } from '@/lib/api-response'
import { feedbackSchema } from '@/lib/validation'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  const p = parsePagination(req)
  const where: Prisma.FeedbackWhereInput = { userId: ctx.user.id }
  if (p.status) where.status = String(p.status)

  const [total, items] = await Promise.all([
    db.feedback.count({ where }),
    db.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
    }),
  ])

  return ok(
    { items, page: p.page, pageSize: p.pageSize, total, totalPages: Math.max(1, Math.ceil(total / p.pageSize)) },
    'My feedback'
  )
}

export async function POST(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = feedbackSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const feedback = await db.feedback.create({
    data: {
      userId: ctx.user.id,
      category: parsed.data.category,
      subject: parsed.data.subject,
      message: parsed.data.message,
      rating: parsed.data.rating || null,
      status: 'NEW',
    },
  })
  return ok({ feedback }, 'Feedback submitted', undefined, 201)
}
