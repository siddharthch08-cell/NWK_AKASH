/**
 * ContentLifecycle — archive/restore operations for chapters, topics, videos.
 *
 * Adds soft-archive semantics (archivedAt timestamp) to prevent accidental
 * data loss while keeping the UI clean. Archived content is hidden from
 * student-facing routes but preserved for historical records.
 *
 * Phase 2 §14: Add archive fields for chapters/topics/videos.
 */

import { db } from '@/lib/db'
import { audit } from '@/lib/audit'
import { NotFoundError, ConflictError, ValidationError } from './errors'
import type { AuditContext } from './types'
import { toAuditAuth } from './types'

// ──────────────────────────────────────────────
// Chapter operations
// ──────────────────────────────────────────────

export async function archiveChapter(
  chapterId: string,
  ctx: AuditContext,
) {
  const chapter = await db.chapter.findUnique({ where: { id: chapterId } })
  if (!chapter) throw new NotFoundError(chapterId, 'Chapter')

  const updated = await db.chapter.update({
    where: { id: chapterId },
    data: { archivedAt: new Date() } as any,
  })

  await audit({
    ctx: toAuditAuth(ctx),
    action: 'CHAPTER_ARCHIVED',
    entityType: 'CHAPTER',
    entityId: chapterId,
    before: { title: chapter.title },
  })

  return updated
}

export async function restoreChapter(
  chapterId: string,
  ctx: AuditContext,
) {
  const chapter = await db.chapter.findUnique({ where: { id: chapterId } })
  if (!chapter) throw new NotFoundError(chapterId, 'Chapter')

  const updated = await db.chapter.update({
    where: { id: chapterId },
    data: { archivedAt: null } as any,
  })

  await audit({
    ctx: toAuditAuth(ctx),
    action: 'CHAPTER_RESTORED',
    entityType: 'CHAPTER',
    entityId: chapterId,
    after: { title: chapter.title },
  })

  return updated
}

/**
 * Delete chapter — only if it has no children.
 */
export async function deleteChapter(chapterId: string, ctx: AuditContext) {
  const chapter = await db.chapter.findUnique({
    where: { id: chapterId },
    include: { course: { select: { status: true } }, _count: { select: { topics: true, materials: true } } },
  })
  if (!chapter) throw new NotFoundError(chapterId, 'Chapter')

  if (chapter._count.topics > 0) {
    throw new ConflictError(`Cannot delete chapter with ${chapter._count.topics} topic(s). Remove topics first or archive them.`)
  }
  if (chapter._count.materials > 0) {
    throw new ConflictError(`Cannot delete chapter with ${chapter._count.materials} material(s). Remove materials first.`)
  }
  if (chapter.course.status !== 'DRAFT') throw new ConflictError('Only unreferenced chapters in draft courses can be hard-deleted')

  await audit({
    ctx: toAuditAuth(ctx),
    action: 'CHAPTER_DELETED',
    entityType: 'CHAPTER',
    entityId: chapterId,
    before: { title: chapter.title },
  })

  await db.chapter.delete({ where: { id: chapterId } })
  return { deleted: true }
}

// ──────────────────────────────────────────────
// Topic operations
// ──────────────────────────────────────────────

export async function archiveTopic(
  topicId: string,
  ctx: AuditContext,
) {
  const topic = await db.topic.findUnique({ where: { id: topicId } })
  if (!topic) throw new NotFoundError(topicId, 'Topic')

  const updated = await db.topic.update({
    where: { id: topicId },
    data: { archivedAt: new Date() } as any,
  })

  await audit({
    ctx: toAuditAuth(ctx),
    action: 'TOPIC_ARCHIVED',
    entityType: 'TOPIC',
    entityId: topicId,
    before: { title: topic.title },
  })

  return updated
}

export async function restoreTopic(
  topicId: string,
  ctx: AuditContext,
) {
  const topic = await db.topic.findUnique({ where: { id: topicId }, include: { chapter: { select: { archivedAt: true } } } })
  if (!topic) throw new NotFoundError(topicId, 'Topic')
  if (topic.chapter.archivedAt) throw new ValidationError('Restore the parent chapter before restoring this topic')

  const updated = await db.topic.update({
    where: { id: topicId },
    data: { archivedAt: null } as any,
  })

  await audit({
    ctx: toAuditAuth(ctx),
    action: 'TOPIC_RESTORED',
    entityType: 'TOPIC',
    entityId: topicId,
    after: { title: topic.title },
  })

  return updated
}

export async function deleteTopic(topicId: string, ctx: AuditContext) {
  const topic = await db.topic.findUnique({
    where: { id: topicId },
    include: { chapter: { include: { course: { select: { status: true } } } }, _count: { select: { videos: true, materials: true } } },
  })
  if (!topic) throw new NotFoundError(topicId, 'Topic')

  if (topic._count.videos > 0) {
    throw new ConflictError(`Cannot delete topic with ${topic._count.videos} video(s). Remove videos first or archive them.`)
  }
  if (topic._count.materials > 0) {
    throw new ConflictError(`Cannot delete topic with ${topic._count.materials} material(s). Remove materials first.`)
  }
  if (topic.chapter.course.status !== 'DRAFT') throw new ConflictError('Only unreferenced topics in draft courses can be hard-deleted')

  await audit({
    ctx: toAuditAuth(ctx),
    action: 'TOPIC_DELETED',
    entityType: 'TOPIC',
    entityId: topicId,
    before: { title: topic.title },
  })

  await db.topic.delete({ where: { id: topicId } })
  return { deleted: true }
}

// ──────────────────────────────────────────────
// Video operations
// ──────────────────────────────────────────────

export async function archiveVideo(
  videoId: string,
  ctx: AuditContext,
) {
  const video = await db.video.findUnique({ where: { id: videoId } })
  if (!video) throw new NotFoundError(videoId, 'Video')

  const updated = await db.video.update({
    where: { id: videoId },
    data: { archivedAt: new Date(), status: 'ARCHIVED' } as any,
  })

  await audit({
    ctx: toAuditAuth(ctx),
    action: 'VIDEO_ARCHIVED',
    entityType: 'VIDEO',
    entityId: videoId,
    before: { title: video.title, youtubeId: video.youtubeId },
  })

  return updated
}

export async function restoreVideo(
  videoId: string,
  ctx: AuditContext,
) {
  const video = await db.video.findUnique({ where: { id: videoId }, include: { topic: { select: { archivedAt: true, chapter: { select: { archivedAt: true } } } } } })
  if (!video) throw new NotFoundError(videoId, 'Video')
  if (video.topic.archivedAt || video.topic.chapter.archivedAt) throw new ValidationError('Restore archived parents before restoring this video')

  const updated = await db.video.update({
    where: { id: videoId },
    data: { archivedAt: null, status: 'DRAFT' } as any,
  })

  await audit({
    ctx: toAuditAuth(ctx),
    action: 'VIDEO_RESTORED',
    entityType: 'VIDEO',
    entityId: videoId,
    after: { title: video.title },
  })

  return updated
}

export async function deleteVideo(videoId: string, ctx: AuditContext) {
  const video = await db.video.findUnique({
    where: { id: videoId },
    include: { _count: { select: { progress: true } } },
  })
  if (!video) throw new NotFoundError(videoId, 'Video')

  if (video._count.progress > 0) {
    throw new ConflictError(
      `Cannot delete video with ${video._count.progress} student progress record(s). Archive the video instead.`
    )
  }
  if (video.status !== 'DRAFT') throw new ConflictError('Only an unreferenced never-published draft video can be hard-deleted')

  await audit({
    ctx: toAuditAuth(ctx),
    action: 'VIDEO_DELETED',
    entityType: 'VIDEO',
    entityId: videoId,
    before: { title: video.title, youtubeId: video.youtubeId },
  })

  await db.video.delete({ where: { id: videoId } })
  return { deleted: true }
}

// ──────────────────────────────────────────────
// Query helpers (hide archived from students)
// ──────────────────────────────────────────────

/**
 * Where clause that excludes archived content.
 * Apply to all student-facing queries.
 */
export function excludeArchived<T extends Record<string, any>>(extra?: T) {
  return { archivedAt: null as null, ...extra }
}

/**
 * Get active chapters for a course (excludes archived).
 */
export async function getActiveChapters(courseId: string) {
  return db.chapter.findMany({
    where: { courseId, archivedAt: null as any } as any,
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { topics: true } },
    },
  })
}

/**
 * Get active topics for a chapter (excludes archived).
 */
export async function getActiveTopics(chapterId: string) {
  return db.topic.findMany({
    where: { chapterId, archivedAt: null as any } as any,
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { videos: true } },
    },
  })
}

/**
 * Get active videos for a topic (excludes archived).
 */
export async function getActiveVideos(topicId: string) {
  return db.video.findMany({
    where: { topicId, archivedAt: null as any } as any,
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { progress: true } },
    },
  })
}
