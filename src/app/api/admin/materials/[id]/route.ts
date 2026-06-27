import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { readUpload } from '@/lib/storage'

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

// Download — admin can download any material
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const material = await db.material.findUnique({ where: { id } })
  if (!material || material.archived) return notFound('Material not found')

  let buffer: Buffer
  try {
    buffer = await readUpload(material.storageKey)
  } catch {
    return notFound('File not found on disk')
  }

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': material.fileType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${material.fileName.replace(/[^\w.\-]/g, '_')}"`,
      'Content-Length': String(buffer.length),
    },
  })
}
