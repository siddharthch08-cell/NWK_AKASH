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

const patchSchema = z.object({
  status: z.enum(['NEW', 'READ', 'REPLIED', 'ARCHIVED']).optional(),
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

  const existing = await db.contactMessage.findUnique({ where: { id } })
  if (!existing) return notFound('Message not found')

  const updated = await db.contactMessage.update({ where: { id }, data: parsed.data })
  return ok({ message: updated }, 'Message updated')
}
