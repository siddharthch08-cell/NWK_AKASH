const FORMULA_PREFIX = /^[=+\-@\t\r\n\u0000-\u001f\u007f]/

/** Neutralize spreadsheet formulas before any CSV quoting occurs. */
export function neutralizeSpreadsheetValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return value
  const text = String(value)
  return FORMULA_PREFIX.test(text) ? `'${text}` : text
}

export function csvCell(value: unknown): string {
  const safe = String(neutralizeSpreadsheetValue(value))
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function createCsv(rows: unknown[][], includeBom = true): string {
  const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n')
  return `${includeBom ? '\uFEFF' : ''}${csv}\r\n`
}

export function sanitizeDownloadFilename(filename: string, fallback = 'download'): string {
  const normalized = filename.normalize('NFKD').replace(/[\u0000-\u001f\u007f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
  return normalized || fallback
}

export function downloadResponse(body: BodyInit, filename: string, contentType: string): Response {
  const safeName = sanitizeDownloadFilename(filename)
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  })
}
