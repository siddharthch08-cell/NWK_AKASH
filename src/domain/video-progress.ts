import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { canAccessVideo } from './student-access'
import { ForbiddenError, NotFoundError, ValidationError } from './errors'

export async function getVideoProgress(userId: string, videoId: string) {
  const access = await canAccessVideo(userId, videoId)
  if (!access.allowed) throw new ForbiddenError(access.reason)
  const video = await db.video.findUnique({ where: { id: videoId }, select: { id: true, title: true, description: true, youtubeId: true, thumbnail: true, duration: true } })
  if (!video) throw new NotFoundError(videoId, 'Video')
  const [settings, progress] = await Promise.all([getSettings(), db.videoProgress.findUnique({ where: { userId_videoId: { userId, videoId } } })])
  return { video, progress, completionThreshold: settings.videoCompletionThreshold }
}

export async function saveVideoProgress(userId: string, videoId: string, position: number, _clientPercent: number, duration: number | undefined, sessionId: string) {
  const access = await canAccessVideo(userId, videoId)
  if (!access.allowed) throw new ForbiddenError(access.reason)
  if (!sessionId || sessionId.length > 100) throw new ValidationError('A playback session ID is required')
  const now = new Date()
  const settings = await getSettings()
  return db.$transaction(async tx => {
    await tx.$executeRaw`UPDATE Video SET updatedAt = updatedAt WHERE id = ${videoId}`
    const video = await tx.video.findUnique({ where: { id: videoId }, select: { duration: true } })
    if (!video) throw new NotFoundError(videoId, 'Video')
    let knownDuration = video.duration
    if (!knownDuration && duration && duration > 0 && duration <= 86_400) {
      knownDuration = Math.floor(duration)
      await tx.video.update({ where: { id: videoId }, data: { duration: knownDuration } })
    }
    const existing = await tx.videoProgress.findUnique({ where: { userId_videoId: { userId, videoId } } })
    const reportedPosition = Math.max(0, Math.min(Math.floor(position), knownDuration || Math.floor(position)))
    const elapsed = existing?.lastHeartbeatAt ? Math.max(0, (now.getTime() - existing.lastHeartbeatAt.getTime()) / 1000) : 0
    if (existing && existing.lastSessionId === sessionId && elapsed < 4) return existing

    const forward = existing && existing.lastSessionId === sessionId ? Math.max(0, reportedPosition - existing.position) : 0
    const plausibleCredit = Math.floor(Math.min(forward, elapsed + 3, 30))
    const watchedSeconds = Math.min(knownDuration || Number.MAX_SAFE_INTEGER, (existing?.watchedSeconds || 0) + plausibleCredit)
    const percent = knownDuration ? Math.max(existing?.percent || 0, Math.min(100, Math.floor((watchedSeconds / knownDuration) * 100))) : 0
    const completed = Boolean(existing?.completed) || Boolean(knownDuration && percent >= settings.videoCompletionThreshold && reportedPosition >= knownDuration * 0.8)
    return tx.videoProgress.upsert({
      where: { userId_videoId: { userId, videoId } },
      create: { userId, videoId, position: reportedPosition, percent, watchedSeconds, completed, completedAt: completed ? now : null, lastWatchedAt: now, lastHeartbeatAt: now, lastSessionId: sessionId },
      update: { position: reportedPosition, percent, watchedSeconds, completed, completedAt: completed ? existing?.completedAt || now : null, lastWatchedAt: now, lastHeartbeatAt: now, lastSessionId: sessionId },
    })
  })
}
