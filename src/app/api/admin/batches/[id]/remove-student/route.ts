import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail, fromZodError } from '@/lib/api-response'
import { z } from 'zod'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({ userId: z.string().min(1) })

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

  const r = await db.batchEnrollment.deleteMany({ where: { batchId: id, userId: parsed.data.userId } })
  if (r.count === 0) return notFound('Enrollment not found')

  await audit({ ctx, action: 'ENROLLMENT_REMOVED', entityType: 'BATCH_ENROLLMENT', entityId: id, before: { userId: parsed.data.userId, batchId: id } })
  return ok({ removed: r.count }, 'Student removed from batch')
}
