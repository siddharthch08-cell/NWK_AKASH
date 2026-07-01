import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, fromZodError, fail, parsePagination } from '@/lib/api-response'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const p = parsePagination(req)
  const where: Prisma.ContactMessageWhereInput = {}
  if (p.search) {
    where.OR = [{ name: { contains: p.search } }, { email: { contains: p.search } }, { subject: { contains: p.search } }]
  }
  if (p.status) where.status = String(p.status)

  const [total, items] = await Promise.all([
    db.contactMessage.count({ where }),
    db.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
    }),
  ])

  return ok(
    { items, page: p.page, pageSize: p.pageSize, total, totalPages: Math.max(1, Math.ceil(total / p.pageSize)) },
    'Contact messages list'
  )
}
