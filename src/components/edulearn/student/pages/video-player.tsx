'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useApp } from '@/stores/app-store'
import { api, ApiError } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'

declare global {
  interface Window {
    YT?: {
      Player: new (
        id: string,
        opts: Record<string, unknown>
      ) => {
        getCurrentTime?: () => number
        getDuration?: () => number
        destroy?: () => void
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiLoaded = false
function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (apiLoaded && window.YT && window.YT.Player) return resolve()
    const existing = document.getElementById('yt-iframe-api')
    if (!existing) {
      const tag = document.createElement('script')
      tag.id = 'yt-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true
      prev?.()
      resolve()
    }
    // Poll in case API was already loaded
    const check = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(check)
        apiLoaded = true
        resolve()
      }
    }, 200)
  })
}

interface VideoData {
  id: string
  title: string
  description?: string | null
  youtubeId: string
  thumbnail?: string | null
  duration?: number | null
}

export function StudentVideoPlayer({ id }: { id: string }) {
  const { setView } = useApp()
  const [data, setData] = useState<VideoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<{ percent: number; position: number; completed: boolean } | null>(null)
  const playerRef = useRef<{ getCurrentTime?: () => number; getDuration?: () => number; destroy?: () => void } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef(0)
  const sessionIdRef = useRef(crypto.randomUUID())
  const progressRef = useRef<{ percent: number; position: number; completed: boolean } | null>(null)
  const dataRef = useRef<VideoData | null>(null)

  useEffect(() => {
    setLoading(true)
    api.get<{ video: VideoData; progress: { percent: number; position: number; completed: boolean } | null }>(`/api/student/videos/${id}/progress`).then((d) => {
      setData(d.video)
      dataRef.current = d.video
      const p = d.progress ? { percent: d.progress.percent, position: d.progress.position, completed: d.progress.completed } : null
      setProgress(p)
      progressRef.current = p
    }).catch((e) => {
      if (e instanceof ApiError) toast.error(e.message)
    }).finally(() => setLoading(false))
  }, [id])

  const sendHeartbeat = useCallback(async (force = false) => {
    if (!playerRef.current || !dataRef.current) return
    try {
      const pos = playerRef.current.getCurrentTime?.() || 0
      const dur = playerRef.current.getDuration?.() || 0
      if (!dur) return
      const pct = Math.min(100, Math.round((pos / dur) * 100))
      // Deduplicate: only send if position moved >5s or percent changed
      const now = Date.now()
      if (!force && now - lastSaveRef.current < 5000 && Math.abs(pos - (progressRef.current?.position || 0)) < 5) return
      lastSaveRef.current = now

      const res = await api.post<{ progress: { percent: number; position: number; completed: boolean } }>(`/api/student/videos/${id}/progress`, { videoId: id, position: Math.floor(pos), percent: pct, duration: Math.floor(dur), sessionId: sessionIdRef.current })
      const newProgress = { percent: res.progress.percent, position: res.progress.position, completed: res.progress.completed }
      setProgress(newProgress)
      const wasCompleted = progressRef.current?.completed
      progressRef.current = newProgress
      if (res.progress.completed && !wasCompleted) {
        toast.success('Video marked as completed!')
      }
    } catch {
      // Silent — heartbeats are best-effort
    }
  }, [id])

  const youtubeId = data?.youtubeId

  useEffect(() => {
    if (!youtubeId) return
    let cancelled = false

    loadYouTubeAPI().then(() => {
      if (cancelled || !containerRef.current) return
      // Clear any existing
      containerRef.current.innerHTML = ''
      const div = document.createElement('div')
      div.id = `yt-player-${id}`
      containerRef.current.appendChild(div)

      if (!window.YT) return;
      playerRef.current = new window.YT.Player(`yt-player-${id}`, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: {
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          start: progressRef.current?.position || 0,
        },
        events: {
          onReady: () => {
            // Don't auto-play — let the user click play
          },
          onStateChange: (e: { data: number }) => {
            // 0 = ended, 1 = playing, 2 = paused
            if (e.data === 0 || e.data === 1 || e.data === 2) {
              void sendHeartbeat(true)
            }
          },
        },
      })
    })

    // Heartbeat every 15 seconds while playing
    heartbeatRef.current = setInterval(() => void sendHeartbeat(), 15000)

    return () => {
      cancelled = true
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      // Save final progress
      void sendHeartbeat(true)
      try { playerRef.current?.destroy?.() } catch { /* ignore cleanup errors */ }
    }
  }, [id, sendHeartbeat, youtubeId])


  if (loading || !data) return <div className="text-center py-12 text-slate-500">Loading video…</div>

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => history.length > 1 ? setView({ name: 'student/courses' }) : setView({ name: 'student/dashboard' })} className="mb-3"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Privacy-enhanced YouTube embed via IFrame API */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <div ref={containerRef} className="w-full h-full" />
          </div>
          <noscript>
            <p className="text-xs text-slate-500 mt-2">JavaScript is required to play this video.</p>
          </noscript>

          <Card className="mt-4"><CardContent className="pt-4">
            <h1 className="text-xl font-bold">{data.title}</h1>
            {data.description && <p className="text-sm text-slate-600 mt-2">{data.description}</p>}
            <div className="mt-3 flex items-center gap-3">
              <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" /> {data.duration ? `${Math.floor(data.duration / 60)}m` : '—'}</Badge>
              {progress?.completed && <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>}
            </div>
            {progress && !progress.completed && (
              <div className="mt-3">
                <div className="text-xs text-slate-500 mb-1">Your progress: {progress.percent}%</div>
                <Progress value={progress.percent} className="h-1.5" />
              </div>
            )}
          </CardContent></Card>

          <Card className="mt-4 bg-blue-50 border-blue-200"><CardContent className="pt-4 text-xs text-blue-800">
            <strong>Privacy note:</strong> This video is delivered via YouTube&apos;s privacy-enhanced embed mode (youtube-nocookie.com). Video IDs are server-controlled and only served to authorized students. Browser-delivered video URLs may still be discoverable by technically skilled users.
          </CardContent></Card>
        </div>

        <div>
          <Card><CardContent className="pt-4">
            <h3 className="font-semibold mb-2">Video Information</h3>
            <div className="text-xs text-slate-500 space-y-1">
              <div>Video ID: <code className="text-slate-700">{data.youtubeId}</code></div>
              <div>Status: Published</div>
            </div>
          </CardContent></Card>
        </div>
      </div>
    </div>
  )
}
