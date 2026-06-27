import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail } from '@/lib/api-response'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

async function setStatus(
  req: NextRequest,
  params: Params,
  newStatus: 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'ACTIVE' | 'INACTIVE',
  action: 'STUDENT_APPROVED' | 'STUDENT_REJECTED' | 'STUDENT_BLOCKED' | 'STUDENT_UNBLOCKED' | 'STUDENT_ACTIVATED' | 'STUDENT_DEACTIVATED',
  validFrom: string[]
) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const user = await db.user.findFirst({ where: { id, role: 'STUDENT' } })
  if (!user) return notFound('Student not found')
  if (!validFrom.includes(user.status)) {
    return fail('INVALID_STATE', `Cannot transition from ${user.status} to ${newStatus}`, 400)
  }
  const before = { status: user.status }
  const updated = await db.user.update({ where: { id }, data: { status: newStatus, rejectionReason: null } })
  await audit({ ctx, action, entityType: 'USER', entityId: id, before, after: { status: updated.status } })
  return ok({ student: { id: updated.id, status: updated.status } }, `Student ${newStatus.toLowerCase()}`)
}

export const POST = (req: NextRequest, params: Params) =>
  setStatus(req, params, 'ACTIVE', 'STUDENT_UNBLOCKED', ['BLOCKED'])
