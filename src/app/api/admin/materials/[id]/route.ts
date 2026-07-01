import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound } from '@/lib/api-response'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const material = await db.material.findUnique({ where: { id } })
  if (!material) return notFound('Material not found')

  // Soft-archive; do not delete the file physically
  const updated = await db.material.update({ where: { id }, data: { archived: true } })
  await audit({ ctx, action: 'MATERIAL_REMOVED', entityType: 'MATERIAL', entityId: id, before: { title: material.title } })
  return ok({ material: updated }, 'Material archived')
}
