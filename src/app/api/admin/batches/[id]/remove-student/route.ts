import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { fail, fromZodError, ok, unauthorized } from '@/lib/api-response'
import { DomainError, EnrollmentService } from '@/domain'

type Params = { params: Promise<{ id: string }> }
const schema = z.object({ userId: z.string().min(1) })

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  let body: unknown
  try { body = await req.json() } catch { return fail('VALIDATION_ERROR', 'Invalid JSON body', 400) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)
  try {
    const result = await EnrollmentService.removeStudentFromBatch((await params).id, parsed.data.userId, { userId: ctx.user.id, role: ctx.user.role, name: ctx.user.name, email: ctx.user.email, status: ctx.user.status, ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId })
    return ok(result, result.removed ? 'Student removed from batch' : 'Student was not enrolled')
  } catch (error) { if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields); throw error }
}
