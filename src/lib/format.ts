export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 140) || `slug-${Date.now()}`
}

export function gradeFromPercentage(pct: number): string {
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B'
  if (pct >= 60) return 'C'
  if (pct >= 50) return 'D'
  return 'F'
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

export function fmtDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function relativeTime(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  const diff = date.getTime() - Date.now()
  const sec = Math.abs(Math.round(diff / 1000))
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  return fmtDate(date)
}

export function maskEmail(email: string): string {
  const [u, d] = email.split('@')
  if (!d) return email
  const visible = u.slice(0, Math.min(2, u.length))
  return `${visible}${'*'.repeat(Math.max(2, u.length - 2))}@${d}`
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
    BLOCKED: 'bg-rose-100 text-rose-700 border-rose-200',
    INACTIVE: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    PUBLISHED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    DRAFT: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    UPCOMING: 'bg-sky-100 text-sky-700 border-sky-200',
    COMPLETED: 'bg-violet-100 text-violet-700 border-violet-200',
    ARCHIVED: 'bg-zinc-200 text-zinc-600 border-zinc-300',
    SCHEDULED: 'bg-sky-100 text-sky-700 border-sky-200',
    UNPUBLISHED: 'bg-amber-100 text-amber-700 border-amber-200',
    SUBMITTED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    IN_PROGRESS: 'bg-sky-100 text-sky-700 border-sky-200',
    ABANDONED: 'bg-zinc-200 text-zinc-600 border-zinc-300',
    NEW: 'bg-sky-100 text-sky-700 border-sky-200',
    REVIEWING: 'bg-amber-100 text-amber-700 border-amber-200',
    RESOLVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    CLOSED: 'bg-zinc-200 text-zinc-600 border-zinc-300',
    READ: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    REPLIED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  }
  return map[status] || 'bg-zinc-100 text-zinc-700 border-zinc-200'
}
