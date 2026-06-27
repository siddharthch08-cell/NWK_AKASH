import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail, fromZodError } from '@/lib/api-response'
import { z } from 'zod'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({ userIds: z.array(z.string()).min(1) })

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

  const batch = await db.batch.findUnique({ where: { id } })
  if (!batch) return notFound('Batch not found')

  const users = await db.user.findMany({
    where: { id: { in: parsed.data.userIds }, role: 'STUDENT', deletedAt: null },
  })
  if (users.length !== parsed.data.userIds.length) {
    return fail('NOT_FOUND', 'One or more students not found', 404)
  }

  let added = 0
  for (const u of users) {
    try {
      await db.batchEnrollment.create({ data: { batchId: id, userId: u.id } })
      added++
      await audit({ ctx, action: 'ENROLLMENT_ASSIGNED', entityType: 'BATCH_ENROLLMENT', entityId: id, after: { userId: u.id, batchId: id } })
    } catch {
      // duplicate enrollment — skip
    }
  }
  return ok({ added }, `Enrolled ${added} student(s)`)
}
