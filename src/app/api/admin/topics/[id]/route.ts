import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { topicSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { ContentLifecycleService, DomainError } from '@/domain'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  if ((body as { restore?: boolean }).restore === true) {
    try {
      const topic = await ContentLifecycleService.restoreTopic(id, { userId: ctx.user.id, role: ctx.user.role, name: ctx.user.name, email: ctx.user.email, status: ctx.user.status, ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId })
      return ok({ topic }, 'Topic restored')
    } catch (error) { if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields); throw error }
  }
  const parsed = topicSchema.partial().safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const existing = await db.topic.findUnique({ where: { id } })
  if (!existing) return notFound('Topic not found')

  const updated = await db.topic.update({ where: { id }, data: parsed.data })
  return ok({ topic: updated }, 'Topic updated')
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const domainCtx = { userId: ctx.user.id, role: ctx.user.role, name: ctx.user.name, email: ctx.user.email, status: ctx.user.status, ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId }
  try {
    const permanent = new URL(req.url).searchParams.get('permanent') === 'true'
    const result = permanent ? await ContentLifecycleService.deleteTopic(id, domainCtx) : await ContentLifecycleService.archiveTopic(id, domainCtx)
    return ok({ topic: permanent ? undefined : result }, permanent ? 'Topic deleted' : 'Topic archived')
  } catch (error) {
    if (error instanceof DomainError) {
      await audit({ ctx, action: 'TOPIC_DELETE_FAILED', entityType: 'TOPIC', entityId: id, outcome: 'DENIED', after: { code: error.code } })
      return fail(error.code, error.message, error.status, error.fields, ctx.requestId)
    }
    throw error
  }
}
