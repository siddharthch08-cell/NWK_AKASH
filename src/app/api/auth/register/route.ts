import { NextRequest } from 'next/server'
import { registerSchema } from '@/lib/validation'
import { fromZodError, tooMany, fail, ok } from '@/lib/api-response'
import { enforceRateLimit } from '@/lib/rate-limit'
import { getTrustedClientIp, requestId } from '@/lib/request-security'
import { DomainError, RegistrationService } from '@/domain'

export async function POST(req: NextRequest) {
  const id = requestId(req)
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400, undefined, id)
  }
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const limit = await enforceRateLimit(req, 'registration', parsed.data.email)
  if (!limit.ok) return tooMany('Too many registration attempts. Please try again later.', limit.retryAfterMs, id)
  try {
    const user = await RegistrationService.registerStudent(parsed.data, {
      requestId: id,
      ip: getTrustedClientIp(req),
      userAgent: req.headers.get('user-agent') || 'unknown',
    })
    return ok(
      { user },
      'Your registration has been submitted successfully. Your account is pending administrator approval. You can log in after approval.',
    )
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields, id)
    throw error
  }
}
