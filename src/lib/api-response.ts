import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export interface ApiMeta {
  page?: number
  pageSize?: number
  total?: number
  totalPages?: number
  [key: string]: unknown
}

export const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
} as const

export function ok<T>(
  data: T,
  message = 'Operation completed successfully',
  meta?: ApiMeta,
  status = 200,
  headers?: Record<string, string>,
) {
  return NextResponse.json(
    { success: true, data, message, meta: meta || {} },
    { status, headers: { 'Cache-Control': 'private, no-store', ...headers } }
  )
}

export function created<T>(data: T, message = 'Created successfully', meta?: ApiMeta) {
  return ok(data, message, meta, 201)
}

export function fail(code: string, message: string, status = 400, fields?: Record<string, string>, requestId?: string) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, fields: fields || {} },
      requestId: requestId || 'n/a',
    },
    { status, headers: { 'Cache-Control': 'no-store', ...(requestId ? { 'X-Request-ID': requestId } : {}) } }
  )
}

export function unauthorized(message = 'Authentication required') {
  return fail('UNAUTHORIZED', message, 401)
}

export function forbidden(message = 'You do not have permission to perform this action') {
  return fail('FORBIDDEN', message, 403)
}

export function notFound(message = 'Resource not found') {
  return fail('NOT_FOUND', message, 404)
}

export function conflict(message = 'Resource already exists') {
  return fail('CONFLICT', message, 409)
}

export function tooMany(message = 'Too many requests. Please slow down.', retryAfterMs = 60_000, requestId?: string) {
  const retryAfter = Math.max(1, Math.ceil(retryAfterMs / 1000))
  return NextResponse.json(
    { success: false, error: { code: 'RATE_LIMITED', message, fields: {} }, requestId: requestId || 'n/a' },
    { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store', ...(requestId ? { 'X-Request-ID': requestId } : {}) } },
  )
}

export function fromZodError(e: ZodError, requestId?: string) {
  const fields: Record<string, string> = {}
  for (const issue of e.issues) {
    const key = issue.path.join('.') || '_'
    fields[key] = issue.message
  }
  return fail('VALIDATION_ERROR', 'The request contains invalid fields', 422, fields, requestId)
}

export function serverError(message = 'Something went wrong. Please try again.', requestId?: string) {
  return fail('INTERNAL_ERROR', message, 500, undefined, requestId)
}

export interface PaginationParams {
  page: number
  pageSize: number
  search?: string
  [key: string]: unknown
}

export function parsePagination(req: Request): PaginationParams {
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '10', 10) || 10))
  const search = url.searchParams.get('search') || undefined
  const params: PaginationParams = { page, pageSize, search }
  url.searchParams.forEach((v, k) => {
    if (k !== 'page' && k !== 'pageSize' && k !== 'search') params[k] = v
  })
  return params
}


