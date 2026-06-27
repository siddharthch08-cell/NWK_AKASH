/**
 * Typed fetch wrapper for the EDULEARN PRO API.
 * Always uses relative URLs so the gateway can route correctly.
 * Reads the access token from localStorage (set on login).
 */
'use client'

export interface ApiEnvelope<T> {
  success: boolean
  data?: T
  message?: string
  meta?: Record<string, unknown>
  error?: { code: string; message: string; fields?: Record<string, string> }
  requestId?: string
}

const TOKEN_KEY = 'edulearn_access_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(t: string | null) {
  if (typeof window === 'undefined') return
  if (t) window.localStorage.setItem(TOKEN_KEY, t)
  else window.localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  code: string
  fields?: Record<string, string>
  status: number
  constructor(code: string, message: string, status: number, fields?: Record<string, string>) {
    super(message)
    this.code = code
    this.fields = fields
    this.status = status
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  // Auto-set JSON content-type for JSON bodies
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  let res: Response
  try {
    res = await fetch(url, { ...options, headers, credentials: 'include' })
  } catch (e) {
    throw new ApiError('NETWORK_ERROR', 'Network request failed. Please check your connection.', 0)
  }

  let envelope: ApiEnvelope<T>
  try {
    envelope = await res.json()
  } catch {
    if (!res.ok) throw new ApiError('HTTP_ERROR', `Request failed (${res.status})`, res.status)
    throw new ApiError('PARSE_ERROR', 'Invalid response from server', res.status)
  }

  if (!envelope.success) {
    throw new ApiError(
      envelope.error?.code || 'UNKNOWN_ERROR',
      envelope.error?.message || 'Request failed',
      res.status,
      envelope.error?.fields
    )
  }
  return envelope.data as T
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
  upload: <T>(url: string, formData: FormData) =>
    request<T>(url, { method: 'POST', body: formData }),
  raw: async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    }
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    return fetch(url, { ...options, headers, credentials: 'include' })
  },
}
