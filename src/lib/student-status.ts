import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireAdmin, LOGINABLE_STATUSES } from '@/lib/auth'
import { ok, unauthorized, notFound, fail, tooMany } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { enforceRateLimit } from '@/lib/rate-limit'

type RouteParams = { params: Promise<{ id: string }> }
type NewStatus = 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
type AuditAction = 'STUDENT_APPROVED' | 'STUDENT_REJECTED' | 'STUDENT_BLOCKED' | 'STUDENT_UNBLOCKED' | 'STUDENT_ACTIVATED' | 'STUDENT_DEACTIVATED' | 'STUDENT_SUSPENDED'



/**
 * Shared student status-transition handler.
 * Validates the student exists, the transition is allowed, updates the status
 * transactionally, writes an audit log, and returns the updated student.
 */
export async function handleStatusChange(
  req: NextRequest,
  routeParams: RouteParams,
  newStatus: NewStatus,
  action: AuditAction,
  validFrom: string[]
) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const limit = await enforceRateLimit(req, 'approval', ctx.user.id)
  if (!limit.ok) return tooMany('Too many student status changes.', limit.retryAfterMs, ctx.requestId)
  const { id } = await routeParams.params

  if (!id) return fail('VALIDATION_ERROR', 'Student ID is required', 400)

  const user = await db.user.findFirst({ where: { id, role: 'STUDENT', deletedAt: null } })
  if (!user) return notFound('Student not found')

  if (!validFrom.includes(user.status)) {
    return fail('INVALID_STATE', `Cannot transition from ${user.status} to ${newStatus}`, 400)
  }

  let body: { reason?: unknown } = {}
  try {
    const parsedBody: unknown = await req.json()
    if (parsedBody && typeof parsedBody === 'object' && 'reason' in parsedBody) {
      body = { reason: parsedBody.reason }
    }
  } catch {
    /* ignore - body is optional */
  }

  const updateData: Prisma.UserUncheckedUpdateInput = { status: newStatus }

  // Handle rejection
  if (newStatus === 'REJECTED') {
    updateData.rejectedAt = new Date()
    updateData.rejectedById = ctx.user.id
    updateData.rejectionReason = body.reason ? String(body.reason).slice(0, 500) : null
  }

  // Clear rejection fields when not rejecting
  if (newStatus !== 'REJECTED') {
    updateData.rejectionReason = null
    updateData.rejectedAt = null
    updateData.rejectedById = null
  }

  // Handle approval
  if (newStatus === 'APPROVED') {
    updateData.approvedAt = new Date()
    updateData.approvedById = ctx.user.id
  }

  // Handle suspension
  if (newStatus === 'SUSPENDED') {
    updateData.suspendedAt = new Date()
    updateData.suspendedById = ctx.user.id
    updateData.suspensionReason = body.reason ? String(body.reason).slice(0, 500) : null
  }

  // Clear suspension fields when not suspending
  if (newStatus !== 'SUSPENDED') {
    updateData.suspensionReason = null
    updateData.suspendedAt = null
    updateData.suspendedById = null
  }

  const before = {
    status: user.status,
    rejectionReason: user.rejectionReason,
    suspensionReason: user.suspensionReason,
  }

  const updated = await db.$transaction(async tx => {
    const result = await tx.user.update({ where: { id }, data: updateData })
    if (!LOGINABLE_STATUSES.has(newStatus)) {
      await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })
    }
    return result
  })

  await audit({
    ctx,
    action,
    entityType: 'USER',
    entityId: id,
    before,
    after: {
      status: updated.status,
      rejectionReason: updated.rejectionReason,
      suspensionReason: updated.suspensionReason,
    },
  })

  return ok(
    {
      student: {
        id: updated.id,
        status: updated.status,
        rejectionReason: updated.rejectionReason,
        suspensionReason: updated.suspensionReason,
      },
    },
    `Student ${newStatus.toLowerCase()}`
  )
}
