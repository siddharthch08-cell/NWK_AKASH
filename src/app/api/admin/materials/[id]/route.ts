import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { fail, fromZodError, ok, unauthorized } from '@/lib/api-response'
import { DomainError, MaterialService } from '@/domain'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }
const patchSchema = z.object({
  batchId: z.string().min(1).optional(), courseId: z.string().min(1).optional(), chapterId: z.string().min(1).optional(), topicId: z.string().optional().nullable(),
  title: z.string().min(2).max(200).optional(), description: z.string().max(2000).optional().nullable(),
  platform: z.enum(['TELEGRAM', 'WHATSAPP', 'GOOGLE_DRIVE', 'OTHER']).optional(), externalUrl: z.string().min(1).optional(),
  materialType: z.enum(['NOTES', 'PDF', 'QUESTION_PAPER', 'REFERENCE', 'OTHER']).optional(), published: z.boolean().optional(), archived: z.boolean().optional(), sortOrder: z.number().int().min(0).optional(),
})

function auditContext(ctx: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>) {
  return { userId: ctx.user.id, role: ctx.user.role, name: ctx.user.name, email: ctx.user.email, status: ctx.user.status, ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  let body: unknown
  try { body = await req.json() } catch { return fail('VALIDATION_ERROR', 'Invalid JSON body', 400) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)
  try {
    const material = await MaterialService.updateMaterial((await params).id, parsed.data, auditContext(ctx))
    return ok({ material }, 'Study material updated')
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields)
    throw error
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  try {
    const result = await MaterialService.archiveOrDeleteMaterial(id, new URL(req.url).searchParams.get('permanent') === 'true', auditContext(ctx))
    return ok(result, 'Study material lifecycle updated')
  } catch (error) {
    if (error instanceof DomainError) {
      await audit({ ctx, action: 'MATERIAL_DELETE_FAILED', entityType: 'MATERIAL', entityId: id, outcome: 'DENIED', after: { code: error.code } })
      return fail(error.code, error.message, error.status, error.fields, ctx.requestId)
    }
    throw error
  }
}
