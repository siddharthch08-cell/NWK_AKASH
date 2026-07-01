/**
 * EDULEARN PRO — Material URL Validation
 * =======================================
 * Validates external resource URLs for Study Materials.
 * Supports: Telegram, WhatsApp, Google Drive, Other (HTTPS only).
 *
 * Usage:
 *   import { validateMaterialUrl, MATERIAL_PLATFORMS } from '@/lib/material-url'
 */

export type MaterialPlatform = 'TELEGRAM' | 'WHATSAPP' | 'GOOGLE_DRIVE' | 'OTHER'

export const MATERIAL_PLATFORMS: Record<MaterialPlatform, { label: string; hosts: string[]; color: string }> = {
  TELEGRAM: {
    label: 'Telegram',
    hosts: ['t.me', 'telegram.me'],
    color: 'bg-sky-100 text-sky-700',
  },
  WHATSAPP: {
    label: 'WhatsApp',
    hosts: ['chat.whatsapp.com', 'wa.me', 'api.whatsapp.com', 'www.whatsapp.com', 'whatsapp.com'],
    color: 'bg-emerald-100 text-emerald-700',
  },
  GOOGLE_DRIVE: {
    label: 'Google Drive',
    hosts: ['drive.google.com', 'docs.google.com'],
    color: 'bg-blue-100 text-blue-700',
  },
  OTHER: {
    label: 'Other Link',
    hosts: [], // Any valid HTTPS URL
    color: 'bg-slate-100 text-slate-700',
  },
}

export interface ValidationResult {
  valid: boolean
  normalizedUrl?: string
  error?: string
}

/**
 * Validate and normalize a material resource URL.
 * Rejects insecure protocols, private networks, localhost, and unsupported hosts.
 */
export function validateMaterialUrl(rawUrl: string, platform: MaterialPlatform): ValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL is required' }
  }

  const trimmed = rawUrl.trim()
  if (!trimmed) return { valid: false, error: 'URL is required' }

  // Reject dangerous protocols immediately
  const lowerTrimmed = trimmed.toLowerCase()
  if (lowerTrimmed.startsWith('javascript:') || lowerTrimmed.startsWith('data:') || lowerTrimmed.startsWith('file:') || lowerTrimmed.startsWith('ftp:')) {
    return { valid: false, error: 'This protocol is not allowed. Use HTTPS only.' }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }

  // Must be HTTPS
  if (url.protocol !== 'https:') {
    // Allow http only in development for localhost testing — but reject for production safety
    if (url.protocol === 'http:' && process.env.NODE_ENV === 'development') {
      // Allow in dev only
    } else {
      return { valid: false, error: 'Only HTTPS URLs are allowed' }
    }
  }

  // Reject embedded credentials
  if (url.username || url.password) {
    return { valid: false, error: 'URLs with embedded credentials are not allowed' }
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '')

  // Reject localhost and loopback
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
    return { valid: false, error: 'Localhost URLs are not allowed' }
  }

  // Reject private network addresses (10.x, 172.16-31.x, 192.168.x)
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname) || /^192\.168\.\d+\.\d+$/.test(hostname) || /^172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+$/.test(hostname)) {
    return { valid: false, error: 'Private network URLs are not allowed' }
  }

  // Reject internal hostnames (no dots = likely internal)
  if (!hostname.includes('.')) {
    return { valid: false, error: 'Internal hostnames are not allowed' }
  }

  // Platform-specific host validation
  if (platform !== 'OTHER') {
    const allowedHosts = MATERIAL_PLATFORMS[platform].hosts
    const isAllowed = allowedHosts.some((h) => hostname === h || hostname.endsWith('.' + h))
    if (!isAllowed) {
      return {
        valid: false,
        error: `This URL doesn't match the ${MATERIAL_PLATFORMS[platform].label} platform. Expected host: ${allowedHosts.join(' or ')}`,
      }
    }
  }

  // Normalize: ensure https, remove trailing slash if path is just /
  let normalized = url.toString()
  if (normalized.endsWith('/') && url.pathname === '/') {
    normalized = normalized.slice(0, -1)
  }

  return { valid: true, normalizedUrl: normalized }
}

/**
 * Get platform label for display.
 */
export function getPlatformLabel(platform: string): string {
  return MATERIAL_PLATFORMS[platform as MaterialPlatform]?.label || 'External Link'
}

/**
 * Get platform badge color for display.
 */
export function getPlatformColor(platform: string): string {
  return MATERIAL_PLATFORMS[platform as MaterialPlatform]?.color || 'bg-slate-100 text-slate-700'
}
