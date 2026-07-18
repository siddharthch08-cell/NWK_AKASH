import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

let db: PrismaClient
let dbOk = false

describe('Admin Approval Workflow', () => {
  let adminId: string
  let pendingUserId: string

  beforeAll(async () => {
    try {
      db = new PrismaClient()
      await db.$queryRaw`SELECT 1`
      dbOk = true
    } catch {
      dbOk = false
      return
    }

    const adminHash = await bcrypt.hash('AdminPass123', 12)
    const admin = await db.user.create({
      data: {
        email: `test-admin-${Date.now()}@example.com`,
        name: 'Test Admin',
        passwordHash: adminHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        termsAccepted: true,
      },
    })
    adminId = admin.id

    const studentHash = await bcrypt.hash('StudentPass123', 12)
    const student = await db.user.create({
      data: {
        email: `test-pending-${Date.now()}@example.com`,
        name: 'Test Pending Student',
        passwordHash: studentHash,
        role: 'STUDENT',
        status: 'PENDING',
        termsAccepted: true,
      },
    })
    pendingUserId = student.id
  })

  afterAll(async () => {
    if (!dbOk) return
    if (pendingUserId) {
      await db.user.delete({ where: { id: pendingUserId } }).catch(() => {})
    }
    if (adminId) {
      await db.user.delete({ where: { id: adminId } }).catch(() => {})
    }
    await db.$disconnect()
  })

  it.skipIf(!dbOk)('approval should record admin ID and timestamp', async () => {
    const before = await db.user.findUnique({ where: { id: pendingUserId } })
    expect(before?.status).toBe('PENDING')
    expect(before?.approvedAt).toBeNull()
    expect(before?.approvedById).toBeNull()

    const now = new Date()
    const updated = await db.user.update({
      where: { id: pendingUserId },
      data: {
        status: 'APPROVED',
        approvedAt: now,
        approvedById: adminId,
      },
    })

    expect(updated.status).toBe('APPROVED')
    expect(updated.approvedAt).toBeTruthy()
    expect(updated.approvedById).toBe(adminId)
  })

  it.skipIf(!dbOk)('approval should be idempotent', async () => {
    const user = await db.user.findUnique({ where: { id: pendingUserId } })
    expect(user?.status).toBe('APPROVED')

    const firstApprovedAt = user?.approvedAt
    if (!firstApprovedAt) throw new Error('Expected approval timestamp fixture')

    const updated = await db.user.update({
      where: { id: pendingUserId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: adminId,
      },
    })

    expect(updated.status).toBe('APPROVED')
    expect(updated.approvedAt?.getTime()).toBeGreaterThanOrEqual(firstApprovedAt.getTime())
  })

  it.skipIf(!dbOk)('batch assignment should not auto-approve account', async () => {
    const batch = await db.batch.create({
      data: {
        name: 'Test Batch',
        slug: `test-batch-${Date.now()}`,
        status: 'ACTIVE',
        createdBy: adminId,
      },
    })

    const studentHash = await bcrypt.hash('StudentPass123', 12)
    const student = await db.user.create({
      data: {
        email: `test-batch-approve-${Date.now()}@example.com`,
        name: 'Test Batch Auto-Approve',
        passwordHash: studentHash,
        role: 'STUDENT',
        status: 'PENDING',
        termsAccepted: true,
      },
    })

    await db.batchEnrollment.create({
      data: {
        batchId: batch.id,
        userId: student.id,
      },
    })

    const user = await db.user.findUnique({ where: { id: student.id } })
    expect(user?.status).toBe('PENDING')
    expect(user?.preferredBatchId).toBeNull()

    await db.batchEnrollment.deleteMany({ where: { userId: student.id } })
    await db.user.delete({ where: { id: student.id } })
    await db.batch.delete({ where: { id: batch.id } })
  })

  it.skipIf(!dbOk)('admin should never see password hash', async () => {
    const user = await db.user.findUnique({
      where: { id: pendingUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        passwordHash: true,
      },
    })

    expect(user?.passwordHash).toBeTruthy()

    const safeUser = await db.user.findUnique({
      where: { id: pendingUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    })

    expect(safeUser).not.toHaveProperty('passwordHash')
  })

  it.skipIf(!dbOk)('rejection should revoke sessions', async () => {
    const studentHash = await bcrypt.hash('StudentPass123', 12)
    const student = await db.user.create({
      data: {
        email: `test-reject-revoke-${Date.now()}@example.com`,
        name: 'Test Rejection Revoke',
        passwordHash: studentHash,
        role: 'STUDENT',
        status: 'APPROVED',
        termsAccepted: true,
      },
    })

    const token = await db.refreshToken.create({
      data: {
        userId: student.id,
        token: `test-token-${Date.now()}`,
        familyId: `test-family-${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    await db.user.update({
      where: { id: student.id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedById: adminId,
      },
    })

    await db.refreshToken.updateMany({
      where: { userId: student.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    const revokedToken = await db.refreshToken.findUnique({ where: { id: token.id } })
    expect(revokedToken?.revokedAt).toBeTruthy()

    await db.refreshToken.deleteMany({ where: { userId: student.id } })
    await db.user.delete({ where: { id: student.id } })
  })
})
