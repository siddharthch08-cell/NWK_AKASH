import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, fail, conflict, notFound, parsePagination } from '@/lib/api-response'
import { testSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const p = parsePagination(req)
  const where: Prisma.TestWhereInput = {}
  if (p.search) {
    where.OR = [{ title: { contains: p.search } }, { description: { contains: p.search } }]
  }
  if (p.status) where.status = String(p.status)
  if (p.batchId) where.batches = { some: { batchId: String(p.batchId) } }

  const [total, items] = await Promise.all([
    db.test.count({ where }),
    db.test.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      include: {
        _count: { select: { questions: true, attempts: true, batches: true } },
        creator: { select: { name: true } },
      },
    }),
  ])

  return ok(
    {
      items: items.map((t) => ({
        ...t,
        questionCount: t._count.questions,
        attemptCount: t._count.attempts,
        batchCount: t._count.batches,
        _count: undefined,
      })),
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
    },
    'Tests list'
  )
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = testSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  if (parsed.data.startAt && parsed.data.endAt && new Date(parsed.data.startAt) > new Date(parsed.data.endAt)) {
    return fail('VALIDATION_ERROR', 'End date must be after start date', 400, { endAt: 'Must be after startAt' })
  }

  const test = await db.test.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      instructions: parsed.data.instructions || null,
      durationMins: parsed.data.durationMins,
      maxAttempts: parsed.data.maxAttempts,
      maxQuestions: parsed.data.maxQuestions,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : null,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null,
      status: parsed.data.status || 'DRAFT',
      passingPct: parsed.data.passingPct ?? null,
      shuffleQuestions: parsed.data.shuffleQuestions ?? false,
      shuffleOptions: parsed.data.shuffleOptions ?? false,
      showAnswerKey: parsed.data.showAnswerKey ?? true,
      showResultImmediately: parsed.data.showResultImmediately ?? true,
      createdBy: ctx.user.id,
      publishedAt: parsed.data.status === 'PUBLISHED' ? new Date() : null,
      batches: parsed.data.batchIds?.length
        ? { create: parsed.data.batchIds.map((batchId) => ({ batchId })) }
        : undefined,
    },
  })
  await audit({ ctx, action: 'TEST_CREATED', entityType: 'TEST', entityId: test.id, after: { title: test.title } })

  return ok({ test }, 'Test created', undefined, 201)
}
