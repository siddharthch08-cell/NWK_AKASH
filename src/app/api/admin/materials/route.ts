import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, fail, fromZodError, parsePagination } from '@/lib/api-response'
import { z } from 'zod'
import { saveUpload } from '@/lib/storage'
import { getSettings } from '@/lib/settings'
import { audit } from '@/lib/audit'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const p = parsePagination(req)
  const where: Prisma.MaterialWhereInput = { archived: false }
  if (p.search) where.title = { contains: p.search }
  if (p.batchId) where.batchId = String(p.batchId)
  if (p.courseId) where.courseId = String(p.courseId)
  if (p.materialType) where.materialType = String(p.materialType)

  const [total, items] = await Promise.all([
    db.material.count({ where }),
    db.material.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      include: {
        batch: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
        uploader: { select: { name: true } },
      },
    }),
  ])

  return ok(
    {
      items,
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
    },
    'Materials list'
  )
}

const metaSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  materialType: z.enum(['NOTES', 'ASSIGNMENT', 'TEST_PAPER', 'REFERENCE']).default('NOTES'),
  visibility: z.enum(['BATCH', 'COURSE', 'BATCH_AND_COURSE']).default('BATCH'),
  batchId: z.string().optional(),
  courseId: z.string().optional(),
  chapterId: z.string().optional(),
  topicId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const settings = await getSettings()
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const metaRaw = formData.get('meta') as string | null

  if (!file) return fail('VALIDATION_ERROR', 'File is required', 400, { file: 'Required' })
  let meta: z.infer<typeof metaSchema>
  try {
    meta = metaSchema.parse(JSON.parse(metaRaw || '{}'))
  } catch (e) {
    if (e instanceof z.ZodError) return fromZodError(e)
    return fail('VALIDATION_ERROR', 'Invalid metadata', 400)
  }

  if (meta.visibility !== 'COURSE' && !meta.batchId) {
    return fail('VALIDATION_ERROR', 'batchId is required for BATCH / BATCH_AND_COURSE visibility', 400, { batchId: 'Required' })
  }
  if (meta.visibility !== 'BATCH' && !meta.courseId) {
    return fail('VALIDATION_ERROR', 'courseId is required for COURSE / BATCH_AND_COURSE visibility', 400, { courseId: 'Required' })
  }

  let uploaded
  try {
    uploaded = await saveUpload(file, settings.maxUploadMb)
  } catch (e) {
    return fail('UPLOAD_FAILED', (e as Error).message, 400)
  }

  const material = await db.material.create({
    data: {
      title: meta.title,
      description: meta.description || null,
      fileName: uploaded.fileName,
      fileType: uploaded.fileType,
      fileSize: uploaded.fileSize,
      storageKey: uploaded.storageKey,
      visibility: meta.visibility,
      batchId: meta.batchId || null,
      courseId: meta.courseId || null,
      chapterId: meta.chapterId || null,
      topicId: meta.topicId || null,
      materialType: meta.materialType,
      uploadedBy: ctx.user.id,
    },
  })
  await audit({ ctx, action: 'MATERIAL_UPLOADED', entityType: 'MATERIAL', entityId: material.id, after: { title: material.title, fileName: material.fileName } })

  return ok({ material }, 'Material uploaded', undefined, 201)
}
