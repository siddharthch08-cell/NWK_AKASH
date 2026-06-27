import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail, fromZodError } from '@/lib/api-response'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

// Body: { items: [{ id, order }] } — reorder within the same topic
const schema = z.object({
  items: z.array(z.object({ id: z.string(), order: z.number().int().min(0) })),
})

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

  const video = await db.video.findUnique({ where: { id } })
  if (!video) return notFound('Video not found')

  await db.$transaction(
    parsed.data.items.map((it) =>
      db.video.update({ where: { id: it.id }, data: { order: it.order } })
    )
  )
  return ok({}, 'Videos reordered')
}
