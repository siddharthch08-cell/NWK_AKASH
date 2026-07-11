import { NextRequest } from 'next/server'
import { requireActiveStudent } from '@/lib/auth'
import { fail, ok, unauthorized } from '@/lib/api-response'
import { DomainError, ResultService } from '@/domain'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  try {
    const result = await ResultService.getStudentResult(id, ctx.user.id)
    return ok(result, result.hidden ? 'Result awaiting publication' : 'Attempt result')
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields, ctx.requestId)
    throw error
  }
}
