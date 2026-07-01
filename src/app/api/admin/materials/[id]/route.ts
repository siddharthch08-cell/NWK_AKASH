import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail, fromZodError } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { validateMaterialUrl, type MaterialPlatform } from '@/lib/material-url'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  platform: z.enum(['TELEGRAM', 'WHATSAPP', 'GOOGLE_DRIVE', 'OTHER']).optional(),
  externalUrl: z.string().min(1).optional(),
  materialType: z.enum(['NOTES', 'PDF', 'QUESTION_PAPER', 'REFERENCE', 'OTHER']).optional(),
  courseId: z.string().min(1).optional(),
  chapterId: z.string().min(1).optional(),
  topicId: z.string().optional().nullable(),
  published: z.boolean().optional(),
  archived: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch { return fail('VALIDATION_ERROR', 'Invalid JSON body', 400) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const existing = await db.material.findUnique({ where: { id } })
  if (!existing) return notFound('Material not found')

  // Validate URL if changing
  if (parsed.data.externalUrl || parsed.data.platform) {
    const platform = (parsed.data.platform || existing.platform) as MaterialPlatform
    const url = parsed.data.externalUrl || existing.externalUrl
    const urlResult = validateMaterialUrl(url, platform)
    if (!urlResult.valid) {
      return fail('VALIDATION_ERROR', urlResult.error!, 422, { externalUrl: urlResult.error! })
    }
    parsed.data.externalUrl = urlResult.normalizedUrl
  }

  // Validate hierarchy if changing
  const finalCourseId = parsed.data.courseId || existing.courseId
  const finalChapterId = parsed.data.chapterId || existing.chapterId
  const finalTopicId = parsed.data.topicId !== undefined ? parsed.data.topicId : existing.topicId

  if (parsed.data.chapterId || parsed.data.courseId) {
    const chapter = await db.chapter.findFirst({ where: { id: finalChapterId, courseId: finalCourseId } })
    if (!chapter) return fail('VALIDATION_ERROR', 'Chapter does not belong to the selected Course', 422, { chapterId: 'Invalid' })
  }
  if (finalTopicId) {
    const topic = await db.topic.findFirst({ where: { id: finalTopicId, chapterId: finalChapterId } })
    if (!topic) return fail('VALIDATION_ERROR', 'Topic does not belong to the selected Chapter', 422, { topicId: 'Invalid' })
  }

  const updated = await db.material.update({
    where: { id },
    data: parsed.data,
    include: {
      course: { select: { id: true, title: true } },
      chapter: { select: { id: true, title: true } },
      topic: { select: { id: true, title: true } },
    },
  })

  await audit({ ctx, action: 'MATERIAL_UPDATED', entityType: 'MATERIAL', entityId: id, before: existing, after: updated })
  return ok({ material: updated }, 'Study Material updated')
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const material = await db.material.findUnique({ where: { id } })
  if (!material) return notFound('Material not found')

  const url = new URL(req.url)
  const permanent = url.searchParams.get('permanent') === 'true'

  if (permanent) {
    await db.material.delete({ where: { id } })
    await audit({ ctx, action: 'MATERIAL_DELETED', entityType: 'MATERIAL', entityId: id, before: { title: material.title } })
    return ok({}, 'Study Material permanently deleted')
  }

  // Archive by default
  const updated = await db.material.update({ where: { id }, data: { archived: true } })
  await audit({ ctx, action: 'MATERIAL_ARCHIVED', entityType: 'MATERIAL', entityId: id, before: { title: material.title } })
  return ok({ material: updated }, 'Study Material archived')
}
