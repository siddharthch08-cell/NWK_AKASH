import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { fail, fromZodError, ok, unauthorized } from '@/lib/api-response'
import { BatchCourseService, DomainError } from '@/domain'

type Params = { params: Promise<{ id: string }> }
const schema = z.object({ courseIds: z.array(z.string()).min(1) })
const context = (ctx: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>) => ({ userId: ctx.user.id, role: ctx.user.role, name: ctx.user.name, email: ctx.user.email, status: ctx.user.status, ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId })

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  let body: unknown
  try { body = await req.json() } catch { return fail('VALIDATION_ERROR', 'Invalid JSON body', 400) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)
  try {
    const result = await BatchCourseService.assignCoursesToBatch((await params).id, parsed.data.courseIds, context(ctx))
    return ok(result, `Assigned ${result.added} course(s)`)
  } catch (error) { if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields); throw error }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const courseId = new URL(req.url).searchParams.get('courseId')
  if (!courseId) return fail('VALIDATION_ERROR', 'courseId query parameter is required', 400)
  try {
    const result = await BatchCourseService.unassignCourseFromBatch((await params).id, courseId, context(ctx))
    return ok(result, result.removed ? 'Course unassigned from batch' : 'Course was already unassigned')
  } catch (error) { if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields); throw error }
}
