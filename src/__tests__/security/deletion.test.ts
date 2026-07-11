import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Content lifecycle ownership', () => {
  const service = fs.readFileSync(path.join(__dirname, '../../domain/content-lifecycle.ts'), 'utf-8')
  const chapterRoute = fs.readFileSync(path.join(__dirname, '../../app/api/admin/chapters/[id]/route.ts'), 'utf-8')
  const topicRoute = fs.readFileSync(path.join(__dirname, '../../app/api/admin/topics/[id]/route.ts'), 'utf-8')
  const videoRoute = fs.readFileSync(path.join(__dirname, '../../app/api/admin/videos/[id]/route.ts'), 'utf-8')

  it('checks chapter and topic dependencies in the domain owner', () => {
    expect(service).toContain('_count: { select: { topics: true, materials: true } }')
    expect(service).toContain('_count: { select: { videos: true, materials: true } }')
    expect(service).toContain('throw new ConflictError')
  })

  it('protects video progress and published history from hard deletion', () => {
    expect(service).toContain('_count: { select: { progress: true } }')
    expect(service).toContain('Archive the video instead')
    expect(service).toContain("video.status !== 'DRAFT'")
  })

  it('archives by default and exposes explicit restore actions', () => {
    expect(chapterRoute).toContain('ContentLifecycleService.archiveChapter')
    expect(topicRoute).toContain('ContentLifecycleService.archiveTopic')
    expect(videoRoute).toContain('ContentLifecycleService.archiveVideo')
    expect(chapterRoute).toContain('ContentLifecycleService.restoreChapter')
    expect(topicRoute).toContain('ContentLifecycleService.restoreTopic')
    expect(videoRoute).toContain('ContentLifecycleService.restoreVideo')
  })
})
