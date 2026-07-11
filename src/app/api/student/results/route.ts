import { NextRequest } from 'next/server'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized, fail } from '@/lib/api-response'
import { ResultService, DomainError } from '@/domain'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()
  try {
    return ok(await ResultService.getStudentResults(ctx.user.id), 'My results')
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, error.status, error.fields)
    throw error
  }
}
