import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, fail } from '@/lib/api-response'
import { TestPublicationService } from '@/domain'
import { DomainError } from '@/domain/errors'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  try {
    const test = await TestPublicationService.publishTest(
      id,
      { userId: ctx.user.id, role: ctx.user.role, name: ctx.user.name, email: ctx.user.email, status: ctx.user.status, ip: ctx.ip, userAgent: ctx.userAgent, requestId: ctx.requestId },
    )
    return ok({ test }, 'Test published')
  } catch (e) {
    if (e instanceof DomainError) {
      return fail(e.code, e.message, e.status, e.fields)
    }
    throw e
  }
}
