import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound } from '@/lib/api-response'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const test = await db.test.findUnique({ where: { id } })
  if (!test) return notFound('Test not found')

  const updated = await db.test.update({ where: { id }, data: { status: 'ARCHIVED' } })
  await audit({ ctx, action: 'TEST_ARCHIVED', entityType: 'TEST', entityId: id, before: { status: test.status }, after: { status: 'ARCHIVED' } })
  return ok({ test: updated }, 'Test archived')
}
