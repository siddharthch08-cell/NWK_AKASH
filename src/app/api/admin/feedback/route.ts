import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, parsePagination } from '@/lib/api-response'
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
