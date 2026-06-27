import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail } from '@/lib/api-response'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const test = await db.test.findUnique({ where: { id } })
  if (!test) return notFound('Test not found')

  const updated = await db.test.update({
    where: { id },
    data: { status: 'PUBLISHED', publishedAt: test.publishedAt || new Date() },
  })
  await audit({ ctx, action: 'TEST_PUBLISHED', entityType: 'TEST', entityId: id, before: { status: test.status }, after: { status: 'PUBLISHED' } })
  return ok({ test: updated }, 'Test published')
}
