import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, fromZodError, fail, notFound, parsePagination } from '@/lib/api-response'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const p = parsePagination(req)
  const where: Prisma.FeedbackWhereInput = {}
  if (p.search) {
    where.OR = [{ subject: { contains: p.search } }, { message: { contains: p.search } }]
  }
  if (p.status) where.status = String(p.status)
  if (p.category) where.category = String(p.category)

  const [total, items] = await Promise.all([
    db.feedback.count({ where }),
    db.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ])

  return ok(
    { items, page: p.page, pageSize: p.pageSize, total, totalPages: Math.max(1, Math.ceil(total / p.pageSize)) },
    'Feedback list'
  )
}

const patchSchema = z.object({
  status: z.enum(['NEW', 'REVIEWING', 'RESOLVED', 'CLOSED']).optional(),
  notes: z.string().max(2000).optional().nullable(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const existing = await db.feedback.findUnique({ where: { id } })
  if (!existing) return notFound('Feedback not found')

  const updated = await db.feedback.update({ where: { id }, data: parsed.data })
  return ok({ feedback: updated }, 'Feedback updated')
}
