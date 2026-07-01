import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized, notFound, forbidden } from '@/lib/api-response'
import { readUpload } from '@/lib/storage'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const material = await db.material.findUnique({
    where: { id },
    include: { batch: true, course: true },
  })
  if (!material || material.archived) return notFound('Material not found')

  // Verify access: student must be enrolled in material.batchId OR (for COURSE visibility)
  // enrolled in any batch that has material.courseId assigned
  let hasAccess = false
  if (material.batchId) {
    const enrollment = await db.batchEnrollment.findUnique({
      where: { batchId_userId: { batchId: material.batchId, userId: ctx.user.id } },
    })
    if (enrollment) hasAccess = true
  }
  if (!hasAccess && material.courseId && material.visibility === 'COURSE') {
    const enrollment = await db.batchEnrollment.findFirst({
      where: {
        userId: ctx.user.id,
        batch: { courses: { some: { courseId: material.courseId } } },
      },
    })
    if (enrollment) hasAccess = true
  }
  if (!hasAccess) return forbidden('You do not have access to this material')

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
