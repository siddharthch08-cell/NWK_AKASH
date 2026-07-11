import { YOUTUBE_ID_REGEX } from './validation'

/**
 * Extract an 11-character YouTube video ID from many URL formats or raw IDs.
 * Returns null when the input cannot be safely resolved.
 */
export function extractYouTubeId(input: string | undefined | null): string | null {
  if (!input) return null
  const raw = input.trim()
  if (!raw) return null

  // Direct 11-char id
  if (YOUTUBE_ID_REGEX.test(raw)) return raw

  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1)
      return YOUTUBE_ID_REGEX.test(id) ? id : null
    }
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const v = url.searchParams.get('v')
      if (v && YOUTUBE_ID_REGEX.test(v)) return v
      // /embed/<id>, /shorts/<id>, /live/<id>
      const m = url.pathname.match(/\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/)
      if (m) return m[1]
    }
  } catch {
    /* not a URL */
  }
  return null
}

/**
 * Build a privacy-enhanced YouTube embed URL. Uses youtube-nocookie.com to
 * reduce tracking surface. Referrer policy is enforced by the iframe element.
 */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`
}

export function youtubeThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}
