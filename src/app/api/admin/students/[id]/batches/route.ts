import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { fail, fromZodError, ok, unauthorized } from '@/lib/api-response'
import { DomainError, EnrollmentService } from '@/domain'

type Params = { params: Promise<{ id: string }> }
const schema = z.object({ batchIds: z.array(z.string()).default([]), removeBatchIds: z.array(z.string()).default([]) })

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const rows = await EnrollmentService.getStudentBatchAssignments((await params).id)
  return ok({ batches: rows.map(row => ({ ...row.batch, enrolledAt: row.enrolledAt })) }, 'Enrolled batches')
}

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  let body: unknown
  try { body = await req.json() } catch { return fail('VALIDATION_ERROR', 'Invalid JSON body', 400) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)
  const userId = (await params).id
  const domainCtx = { userId: ctx.user.id, role: ctx.user.role, name: ctx.user.name, email: ctx.user.email, status: ctx.user.status, ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId }
  try {
    let added = 0
    let removed = 0
    for (const batchId of parsed.data.batchIds) added += (await EnrollmentService.assignStudentToBatch(batchId, userId, domainCtx)).added.length
    for (const batchId of parsed.data.removeBatchIds) removed += (await EnrollmentService.removeStudentFromBatch(batchId, userId, domainCtx)).removed ? 1 : 0
    return ok({ added, removed }, `Enrollment updated (added ${added}, removed ${removed})`)
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields)
    throw error
  }
}
