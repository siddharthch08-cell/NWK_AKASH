import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({ status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED']) })

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
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid status', 400)

  const existing = await db.video.findUnique({ where: { id } })
  if (!existing) return notFound('Video not found')

  const data: Record<string, unknown> = { status: parsed.data.status }
  if (parsed.data.status === 'PUBLISHED' && !existing.publishedAt) {
    data.publishedAt = new Date()
  }
  const updated = await db.video.update({ where: { id }, data })
  if (parsed.data.status === 'PUBLISHED') {
    await audit({ ctx, action: 'VIDEO_PUBLISHED', entityType: 'VIDEO', entityId: id, before: { status: existing.status }, after: { status: 'PUBLISHED' } })
  }
  return ok({ video: updated }, `Video ${parsed.data.status.toLowerCase()}`)
}
