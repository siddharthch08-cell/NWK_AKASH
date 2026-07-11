import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, fail, fromZodError } from '@/lib/api-response'
import { z } from 'zod'
import { EnrollmentService } from '@/domain'
import { DomainError } from '@/domain/errors'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({ userIds: z.array(z.string()).min(1) })

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch { return fail('VALIDATION_ERROR', 'Invalid JSON body', 400) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  try {
    const result = await EnrollmentService.enrollStudents(
      id,
      parsed.data.userIds,
      { userId: ctx.user.id, role: ctx.user.role, name: ctx.user.name, email: ctx.user.email, status: ctx.user.status, ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId },
    )
    return ok(result, `Enrolled ${result.enrolled} student(s)${result.skipped ? `, ${result.skipped} already enrolled` : ''}`)
  } catch (e) {
    if (e instanceof DomainError) {
      return fail(e.code, e.message, e.status, e.fields)
    }
    throw e
  }
}
