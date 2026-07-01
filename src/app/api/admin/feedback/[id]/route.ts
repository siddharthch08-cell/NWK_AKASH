import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fromZodError, fail } from '@/lib/api-response'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  status: z.enum(['NEW', 'REVIEWING', 'RESOLVED', 'CLOSED']).optional(),
  notes: z.string().max(2000).optional().nullable(),
})

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const feedback = await db.feedback.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  if (!feedback) return notFound('Feedback not found')
  return ok({ feedback }, 'Feedback detail')
}

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

  const existing = await db.feedback.findUnique({ where: { id } })
  if (!existing) return notFound('Feedback not found')

  const updated = await db.feedback.update({ where: { id }, data: parsed.data })
  return ok({ feedback: updated }, 'Feedback updated')
}
