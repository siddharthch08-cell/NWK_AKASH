import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail, fromZodError } from '@/lib/api-response'
import { z } from 'zod'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({
  batchIds: z.array(z.string()).default([]),
  removeBatchIds: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const user = await db.user.findFirst({ where: { id, role: 'STUDENT' } })
  if (!user) return notFound('Student not found')

  const enrollments = await db.batchEnrollment.findMany({
    where: { userId: id },
    include: {
      batch: { select: { id: true, name: true, slug: true, status: true, startDate: true, endDate: true } },
    },
    orderBy: { enrolledAt: 'desc' },
  })
  return ok({ batches: enrollments.map((e) => ({ ...e.batch, enrolledAt: e.enrolledAt })) }, 'Enrolled batches')
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
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const user = await db.user.findFirst({ where: { id, role: 'STUDENT' } })
  if (!user) return notFound('Student not found')

  const { batchIds, removeBatchIds } = parsed.data
  let added = 0
  let removed = 0

  if (batchIds.length) {
    // Validate all batches exist
    const valid = await db.batch.findMany({ where: { id: { in: batchIds } } })
    if (valid.length !== batchIds.length) {
      return fail('NOT_FOUND', 'One or more batches not found', 404)
    }
    for (const batchId of batchIds) {
      try {
        await db.batchEnrollment.create({ data: { batchId, userId: id } })
        added++
        await audit({ ctx, action: 'ENROLLMENT_ASSIGNED', entityType: 'BATCH_ENROLLMENT', entityId: batchId, after: { userId: id, batchId } })
      } catch (e) {
        // duplicate — skip
      }
    }
  }
  if (removeBatchIds.length) {
    for (const batchId of removeBatchIds) {
      const r = await db.batchEnrollment.deleteMany({ where: { batchId, userId: id } })
      removed += r.count
      if (r.count > 0) {
        await audit({ ctx, action: 'ENROLLMENT_REMOVED', entityType: 'BATCH_ENROLLMENT', entityId: batchId, before: { userId: id, batchId } })
      }
    }
  }

  return ok({ added, removed }, `Enrollment updated (added ${added}, removed ${removed})`)
}
