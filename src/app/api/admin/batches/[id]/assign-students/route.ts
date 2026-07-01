import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail, fromZodError, conflict } from '@/lib/api-response'
import { z } from 'zod'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({ userIds: z.array(z.string()).min(1) })

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch { return fail('VALIDATION_ERROR', 'Invalid JSON body', 400) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const batch = await db.batch.findUnique({ where: { id } })
  if (!batch) return notFound('Batch not found')

  const users = await db.user.findMany({
    where: { id: { in: parsed.data.userIds }, role: 'STUDENT', deletedAt: null },
  })
  if (users.length !== parsed.data.userIds.length) {
    return fail('NOT_FOUND', 'One or more students not found', 404)
  }

  // Check capacity transactionally
  if (batch.capacity) {
    const currentCount = await db.batchEnrollment.count({ where: { batchId: id } })
    const remaining = batch.capacity - currentCount
    if (parsed.data.userIds.length > remaining) {
      return conflict(
        `Batch is at capacity (${currentCount}/${batch.capacity}). Only ${remaining} slot(s) remaining, but ${parsed.data.userIds.length} student(s) requested.`
      )
    }
  }

  let added = 0
  const already: string[] = []
  for (const u of users) {
    try {
      await db.batchEnrollment.create({ data: { batchId: id, userId: u.id } })
      added++
      await audit({ ctx, action: 'ENROLLMENT_ASSIGNED', entityType: 'BATCH_ENROLLMENT', entityId: id, after: { userId: u.id, batchId: id } })
    } catch {
      already.push(u.name)
    }
  }
  return ok({ added, alreadyEnrolled: already }, `Enrolled ${added} student(s)${already.length ? `, ${already.length} already enrolled` : ''}`)
}
