import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { readUpload } from '@/lib/storage'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/materials/[id]/download
 * Admin can download any material.
 */
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

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': material.fileType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${material.fileName.replace(/[^\w.\-]/g, '_')}"`,
      'Content-Length': String(buffer.length),
    },
  })
}
