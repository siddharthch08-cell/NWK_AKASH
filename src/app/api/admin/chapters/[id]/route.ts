import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { chapterSchema } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

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
  const parsed = chapterSchema.partial().safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const existing = await db.chapter.findUnique({ where: { id } })
  if (!existing) return notFound('Chapter not found')

  const updated = await db.chapter.update({ where: { id }, data: parsed.data })
  return ok({ chapter: updated }, 'Chapter updated')
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const existing = await db.chapter.findUnique({ where: { id } })
  if (!existing) return notFound('Chapter not found')
  await db.chapter.delete({ where: { id } })
  return ok({}, 'Chapter deleted')
}
