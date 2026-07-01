import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, fail, parsePagination } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { validateMaterialUrl, type MaterialPlatform } from '@/lib/material-url'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const p = parsePagination(req)
  const where: Prisma.MaterialWhereInput = {}

  if (p.search) where.title = { contains: p.search }
  if (p.courseId) where.courseId = String(p.courseId)
  if (p.chapterId) where.chapterId = String(p.chapterId)
  if (p.topicId) where.topicId = String(p.topicId)
  if (p.platform) where.platform = String(p.platform)
  if (p.materialType) where.materialType = String(p.materialType)
  if (p.published) where.published = String(p.published) === 'true'
  if (p.archived) where.archived = String(p.archived) === 'true'

  const [total, items] = await Promise.all([
    db.material.count({ where }),
    db.material.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      include: {
        course: { select: { id: true, title: true } },
        chapter: { select: { id: true, title: true } },
        topic: { select: { id: true, title: true } },
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
    'Study Materials list'
  )
}

const createSchema = z.object({
  batchId: z.string().min(1), // validation context only
  courseId: z.string().min(1),
  chapterId: z.string().min(1),
  topicId: z.string().optional().nullable(),
  title: z.string().min(2, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  platform: z.enum(['TELEGRAM', 'WHATSAPP', 'GOOGLE_DRIVE', 'OTHER']),
  externalUrl: z.string().min(1, 'URL is required'),
  materialType: z.enum(['NOTES', 'PDF', 'QUESTION_PAPER', 'REFERENCE', 'OTHER']).default('PDF'),
  published: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const { batchId, courseId, chapterId, topicId, title, description, platform, externalUrl, materialType, published } = parsed.data

  // 1. Validate Batch exists and is ACTIVE
  const batch = await db.batch.findUnique({ where: { id: batchId }, select: { id: true, status: true, name: true } })
  if (!batch) return fail('NOT_FOUND', 'Batch not found', 404)
  if (batch.status !== 'ACTIVE') return fail('VALIDATION_ERROR', `Batch "${batch.name}" is not ACTIVE`, 422, { batchId: 'Batch must be ACTIVE' })

  // 2. Validate Course exists and is PUBLISHED
  const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true, status: true, title: true } })
  if (!course) return fail('NOT_FOUND', 'Course not found', 404)
  if (course.status !== 'PUBLISHED') return fail('VALIDATION_ERROR', `Course "${course.title}" is not PUBLISHED`, 422, { courseId: 'Course must be PUBLISHED' })

  // 3. Validate Course is assigned to the selected Batch
  const assignment = await db.batchCourse.findUnique({
    where: { batchId_courseId: { batchId, courseId } },
  })
  if (!assignment) return fail('VALIDATION_ERROR', 'This Course is not assigned to the selected Batch', 422, { courseId: 'Course must be assigned to the selected Batch' })

  // 4. Validate Chapter belongs to the Course
  const chapter = await db.chapter.findFirst({ where: { id: chapterId, courseId }, select: { id: true, title: true } })
  if (!chapter) return fail('VALIDATION_ERROR', 'Chapter does not belong to the selected Course', 422, { chapterId: 'Invalid chapter for this course' })

  // 5. Validate Topic (when provided) belongs to the Chapter
  if (topicId) {
    const topic = await db.topic.findFirst({ where: { id: topicId, chapterId }, select: { id: true, title: true } })
    if (!topic) return fail('VALIDATION_ERROR', 'Topic does not belong to the selected Chapter', 422, { topicId: 'Invalid topic for this chapter' })
  }

  // 6. Validate URL
  const urlResult = validateMaterialUrl(externalUrl, platform as MaterialPlatform)
  if (!urlResult.valid) {
    return fail('VALIDATION_ERROR', urlResult.error!, 422, { externalUrl: urlResult.error! })
  }

  // Create the Material
  const material = await db.material.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      platform,
      externalUrl: urlResult.normalizedUrl!,
      materialType,
      courseId,
      chapterId,
      topicId: topicId || null,
      published,
      createdById: ctx.user.id,
    },
    include: {
      course: { select: { id: true, title: true } },
      chapter: { select: { id: true, title: true } },
      topic: { select: { id: true, title: true } },
    },
  })

  await audit({
    ctx,
    action: 'MATERIAL_CREATED',
    entityType: 'MATERIAL',
    entityId: material.id,
    after: { title: material.title, platform, courseId, chapterId, topicId },
  })

  return ok({ material }, 'Study Material created', undefined, 201)
}
