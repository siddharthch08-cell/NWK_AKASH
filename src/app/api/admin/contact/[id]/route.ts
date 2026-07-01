import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fromZodError, fail } from '@/lib/api-response'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  status: z.enum(['NEW', 'READ', 'REPLIED', 'ARCHIVED']).optional(),
  notes: z.string().max(2000).optional().nullable(),
})

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const message = await db.contactMessage.findUnique({ where: { id } })
  if (!message) return notFound('Message not found')

  // Auto-mark as READ only if currently NEW — return the post-update record
  if (message.status === 'NEW') {
    const updated = await db.contactMessage.update({ where: { id }, data: { status: 'READ' } })
    return ok({ message: updated }, 'Contact message detail')
  }
  return ok({ message }, 'Contact message detail')
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

  const existing = await db.contactMessage.findUnique({ where: { id } })
  if (!existing) return notFound('Message not found')

  const updated = await db.contactMessage.update({ where: { id }, data: parsed.data })
  return ok({ message: updated }, 'Message updated')
}
