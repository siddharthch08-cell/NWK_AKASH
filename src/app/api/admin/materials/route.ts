import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { fail, fromZodError, ok, parsePagination, unauthorized } from '@/lib/api-response'
import { DomainError, MaterialService } from '@/domain'

const createSchema = z.object({
  batchId: z.string().min(1).optional(),
  courseId: z.string().min(1), chapterId: z.string().min(1), topicId: z.string().optional().nullable(),
  title: z.string().min(2).max(200), description: z.string().max(2000).optional().nullable(),
  platform: z.enum(['TELEGRAM', 'WHATSAPP', 'GOOGLE_DRIVE', 'OTHER']), externalUrl: z.string().min(1),
  materialType: z.enum(['NOTES', 'PDF', 'QUESTION_PAPER', 'REFERENCE', 'OTHER']).default('PDF'),
  published: z.boolean().default(false), sortOrder: z.number().int().min(0).optional(),
})

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const p = parsePagination(req)
  const where: Prisma.MaterialWhereInput = {}
  if (p.search) where.title = { contains: p.search }
  for (const field of ['courseId', 'chapterId', 'topicId', 'platform', 'materialType'] as const) if (p[field]) where[field] = String(p[field])
  if (p.published !== undefined) where.published = String(p.published) === 'true'
  if (p.archived !== undefined) where.archived = String(p.archived) === 'true'
  const [total, items] = await Promise.all([
    db.material.count({ where }),
    db.material.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (p.page - 1) * p.pageSize, take: p.pageSize, include: { course: { select: { id: true, title: true } }, chapter: { select: { id: true, title: true } }, topic: { select: { id: true, title: true } } } }),
  ])
  return ok({ items, page: p.page, pageSize: p.pageSize, total, totalPages: Math.max(1, Math.ceil(total / p.pageSize)) }, 'Study materials list')
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  let body: unknown
  try { body = await req.json() } catch { return fail('VALIDATION_ERROR', 'Invalid JSON body', 400) }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)
  try {
    const material = await MaterialService.createMaterial(parsed.data, { userId: ctx.user.id, role: ctx.user.role, name: ctx.user.name, email: ctx.user.email, status: ctx.user.status, ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId })
    return ok({ material }, 'Study material created', undefined, 201)
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields)
    throw error
  }
}
