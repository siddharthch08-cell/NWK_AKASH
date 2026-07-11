import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { validateMaterialUrl, type MaterialPlatform } from '@/lib/material-url'
import { ConflictError, NotFoundError, ValidationError } from './errors'
import type { AuditContext, TxClient } from './types'
import { toAuditAuth } from './types'

const MATERIAL_TYPES = new Set(['NOTES', 'PDF', 'QUESTION_PAPER', 'REFERENCE', 'OTHER'])

export type MaterialInput = {
  batchId?: string
  courseId: string
  chapterId: string
  topicId?: string | null
  title: string
  description?: string | null
  platform: MaterialPlatform
  externalUrl: string
  materialType: string
  published: boolean
  archived?: boolean
  sortOrder?: number
}

async function validateFinalState(tx: TxClient, input: MaterialInput) {
  const [course, chapter] = await Promise.all([
    tx.course.findUnique({ where: { id: input.courseId }, select: { id: true, status: true, title: true } }),
    tx.chapter.findUnique({ where: { id: input.chapterId }, select: { id: true, courseId: true, archivedAt: true } }),
  ])
  if (!course) throw new NotFoundError(input.courseId, 'Course')
  if (course.status === 'ARCHIVED') throw new ValidationError('Archived courses cannot own active material')
  if (!chapter || chapter.courseId !== input.courseId) throw new ValidationError('Chapter does not belong to the selected course', { chapterId: 'Invalid chapter for this course' })

  let topic: { chapterId: string; archivedAt: Date | null } | null = null
  if (input.topicId) {
    topic = await tx.topic.findUnique({ where: { id: input.topicId }, select: { chapterId: true, archivedAt: true } })
    if (!topic || topic.chapterId !== input.chapterId) throw new ValidationError('Topic does not belong to the selected chapter', { topicId: 'Invalid topic for this chapter' })
  }
  if (input.batchId) {
    const batch = await tx.batch.findUnique({ where: { id: input.batchId }, select: { status: true } })
    if (!batch) throw new NotFoundError(input.batchId, 'Batch')
    const relation = await tx.batchCourse.findUnique({ where: { batchId_courseId: { batchId: input.batchId, courseId: input.courseId } } })
    if (!relation) throw new ValidationError('Course is not assigned to the selected eligibility batch', { batchId: 'Batch does not provide this course' })
  }
  if (input.published && course.status !== 'PUBLISHED') throw new ValidationError('Material cannot be published until its course is published')
  if (input.published && (chapter.archivedAt || topic?.archivedAt)) throw new ValidationError('Material cannot be published under an archived parent')
  if (!input.title.trim()) throw new ValidationError('Material title is required', { title: 'Required' })
  if (!MATERIAL_TYPES.has(input.materialType)) throw new ValidationError('Unsupported material type', { materialType: 'Invalid type' })
  const url = validateMaterialUrl(input.externalUrl, input.platform)
  if (!url.valid || !url.normalizedUrl) throw new ValidationError(url.error || 'Invalid material URL', { externalUrl: url.error || 'Invalid URL' })
  return url.normalizedUrl
}

export async function createMaterial(input: MaterialInput, ctx: AuditContext) {
  const material = await db.$transaction(async tx => {
    const externalUrl = await validateFinalState(tx, input)
    return tx.material.create({
      data: {
        title: input.title.trim(), description: input.description?.trim() || null,
        platform: input.platform, externalUrl, materialType: input.materialType,
        courseId: input.courseId, chapterId: input.chapterId, topicId: input.topicId || null,
        published: input.published, archived: input.archived ?? false,
        sortOrder: input.sortOrder ?? 0, createdById: ctx.userId,
      },
      include: { course: { select: { id: true, title: true } }, chapter: { select: { id: true, title: true } }, topic: { select: { id: true, title: true } } },
    })
  })
  await audit({ ctx: toAuditAuth(ctx), action: 'MATERIAL_CREATED', entityType: 'MATERIAL', entityId: material.id, after: { courseId: material.courseId, chapterId: material.chapterId, topicId: material.topicId, published: material.published } })
  return material
}

export async function updateMaterial(materialId: string, patch: Partial<MaterialInput>, ctx: AuditContext) {
  const { existing, updated } = await db.$transaction(async tx => {
    const existing = await tx.material.findUnique({ where: { id: materialId } })
    if (!existing) throw new NotFoundError(materialId, 'Material')
    const finalState: MaterialInput = {
      batchId: patch.batchId,
      courseId: patch.courseId ?? existing.courseId,
      chapterId: patch.chapterId ?? existing.chapterId,
      topicId: patch.topicId !== undefined ? patch.topicId : existing.topicId,
      title: patch.title ?? existing.title,
      description: patch.description !== undefined ? patch.description : existing.description,
      platform: (patch.platform ?? existing.platform) as MaterialPlatform,
      externalUrl: patch.externalUrl ?? existing.externalUrl,
      materialType: patch.materialType ?? existing.materialType,
      published: patch.published ?? existing.published,
      archived: patch.archived ?? existing.archived,
      sortOrder: patch.sortOrder ?? existing.sortOrder,
    }
    const externalUrl = await validateFinalState(tx, finalState)
    const updated = await tx.material.update({
      where: { id: materialId },
      data: {
        title: finalState.title.trim(), description: finalState.description?.trim() || null,
        platform: finalState.platform, externalUrl, materialType: finalState.materialType,
        courseId: finalState.courseId, chapterId: finalState.chapterId, topicId: finalState.topicId || null,
        published: finalState.published, archived: finalState.archived, sortOrder: finalState.sortOrder,
      },
      include: { course: { select: { id: true, title: true } }, chapter: { select: { id: true, title: true } }, topic: { select: { id: true, title: true } } },
    })
    return { existing, updated }
  })
  await audit({ ctx: toAuditAuth(ctx), action: 'MATERIAL_UPDATED', entityType: 'MATERIAL', entityId: materialId, before: existing, after: updated })
  return updated
}

export async function archiveOrDeleteMaterial(materialId: string, permanent: boolean, ctx: AuditContext) {
  const existing = await db.material.findUnique({ where: { id: materialId } })
  if (!existing) throw new NotFoundError(materialId, 'Material')
  if (permanent) {
    if (existing.published) throw new ConflictError('Published material must be archived to preserve academic history')
    await db.material.delete({ where: { id: materialId } })
    await audit({ ctx: toAuditAuth(ctx), action: 'MATERIAL_DELETED', entityType: 'MATERIAL', entityId: materialId, before: existing })
    return { deleted: true }
  }
  const material = await db.material.update({ where: { id: materialId }, data: { archived: true, published: false } })
  await audit({ ctx: toAuditAuth(ctx), action: 'MATERIAL_ARCHIVED', entityType: 'MATERIAL', entityId: materialId, before: existing, after: material })
  return { material }
}

export async function restoreMaterial(materialId: string, ctx: AuditContext) {
  const existing = await db.material.findUnique({ where: { id: materialId } })
  if (!existing) throw new NotFoundError(materialId, 'Material')
  const material = await db.material.update({ where: { id: materialId }, data: { archived: false } })
  await audit({ ctx: toAuditAuth(ctx), action: 'MATERIAL_RESTORED', entityType: 'MATERIAL', entityId: materialId, before: existing, after: material })
  return material
}
