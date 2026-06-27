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

  const extra: Record<string, unknown> = {}
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    /* ignore */
  }
  if (newStatus === 'REJECTED' && body.reason) {
    extra.rejectionReason = String(body.reason).slice(0, 500)
  }
  if (newStatus !== 'REJECTED') {
    extra.rejectionReason = null
  }

  const before = { status: user.status, rejectionReason: user.rejectionReason }
  const updated = await db.user.update({
    where: { id },
    data: { status: newStatus, ...extra },
  })
  await audit({
    ctx,
    action,
    entityType: 'USER',
    entityId: id,
    before,
    after: { status: updated.status, rejectionReason: updated.rejectionReason },
  })

  return ok({ student: { id: updated.id, status: updated.status, rejectionReason: updated.rejectionReason } }, `Student ${newStatus.toLowerCase()}`)
}

export const POST = (req: NextRequest, params: Params) =>
  setStatus(req, params, 'APPROVED', 'STUDENT_APPROVED', ['PENDING', 'REJECTED', 'INACTIVE'])
