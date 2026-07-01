import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, fail, serverError, parsePagination } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const p = parsePagination(req)
  const where: Prisma.UserWhereInput = { role: 'STUDENT', deletedAt: null }

  if (p.search) {
    where.OR = [
      { name: { contains: p.search } },
      { email: { contains: p.search } },
      { phone: { contains: p.search } },
    ]
  }
  if (p.status) where.status = String(p.status)
  if (p.batchId) where.enrollments = { some: { batchId: String(p.batchId) } }
  if (p.fromDate || p.toDate) {
    where.createdAt = {}
    if (p.fromDate) where.createdAt.gte = new Date(String(p.fromDate))
    if (p.toDate) where.createdAt.lte = new Date(String(p.toDate))
  }

  const sortBy = (p.sortBy as string) || 'createdAt'
  const sortDir = (p.sortDir as string) === 'asc' ? 'asc' : 'desc'
  const orderBy: Prisma.UserOrderByWithRelationInput = { [sortBy]: sortDir }

  const [total, items] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy,
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        photo: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        rejectionReason: true,
        _count: { select: { enrollments: true, testAttempts: true } },
      },
    }),
  ])

  return ok(
    {
      items: items.map((u) => ({
        ...u,
        enrolledBatches: u._count.enrollments,
        testAttempts: u._count.testAttempts,
        _count: undefined,
      })),
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
    },
    'Students list',
    { page: p.page, pageSize: p.pageSize, total, totalPages: Math.max(1, Math.ceil(total / p.pageSize)) }
  )
}

// Bulk approve
export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }

  const { userIds } = (body || {}) as { userIds?: string[] }
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return fail('VALIDATION_ERROR', 'userIds is required', 400, { userIds: 'Required' })
  }

  let successCount = 0
  let failedCount = 0
  const errors: { userId: string; error: string }[] = []

  await db.$transaction(async (tx) => {
    for (const userId of userIds) {
      try {
        const user = await tx.user.findFirst({ where: { id: userId, role: 'STUDENT' } })
        if (!user) {
          failedCount++
          errors.push({ userId, error: 'Student not found' })
          continue
        }
        if (user.status === 'APPROVED' || user.status === 'ACTIVE') {
          failedCount++
          errors.push({ userId, error: `Already ${user.status}` })
          continue
        }
        await tx.user.update({ where: { id: userId }, data: { status: 'APPROVED' } })
        await tx.auditLog.create({
          data: {
            actorId: ctx.user.id,
            actorRole: ctx.user.role,
            action: 'BULK_STUDENT_APPROVED',
            entityType: 'USER',
            entityId: userId,
            before: JSON.stringify({ status: user.status }),
            after: JSON.stringify({ status: 'APPROVED' }),
            ip: ctx.ip,
            userAgent: ctx.userAgent,
            requestId: ctx.requestId,
          },
        })
        successCount++
      } catch (e) {
        failedCount++
        errors.push({ userId, error: (e as Error).message })
      }
    }
  })

  return ok({ successCount, failedCount, errors }, `Approved ${successCount} student(s)`)
}
