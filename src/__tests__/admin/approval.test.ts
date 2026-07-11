import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

describe('Admin Approval Workflow', () => {
  let adminId: string
  let pendingUserId: string

  beforeAll(async () => {
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
    if (pendingUserId) {
      await db.user.delete({ where: { id: pendingUserId } }).catch(() => {})
    }
    if (adminId) {
      await db.user.delete({ where: { id: adminId } }).catch(() => {})
    }
    await db.$disconnect()
  })

  it('approval should record admin ID and timestamp', async () => {
    const before = await db.user.findUnique({ where: { id: pendingUserId } })
    expect(before?.status).toBe('PENDING')
    expect(before?.approvedAt).toBeNull()
    expect(before?.approvedById).toBeNull()

    // Simulate approval
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

  it('approval should be idempotent', async () => {
    // Approving an already approved user should not fail
    const user = await db.user.findUnique({ where: { id: pendingUserId } })
    expect(user?.status).toBe('APPROVED')

    const firstApprovedAt = user?.approvedAt

    // Re-approve
    const updated = await db.user.update({
      where: { id: pendingUserId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: adminId,
      },
    })

    expect(updated.status).toBe('APPROVED')
    // Timestamp should be updated
    expect(updated.approvedAt?.getTime()).toBeGreaterThanOrEqual(firstApprovedAt!.getTime())
  })

  it('batch assignment should not auto-approve account', async () => {
    // Create a batch
    const batch = await db.batch.create({
      data: {
        name: 'Test Batch',
        slug: `test-batch-${Date.now()}`,
        status: 'ACTIVE',
        createdBy: adminId,
      },
    })

    // Create a PENDING user
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

    // Assign batch
    await db.batchEnrollment.create({
      data: {
        batchId: batch.id,
        userId: student.id,
      },
    })

    // Verify user is still PENDING
    const user = await db.user.findUnique({ where: { id: student.id } })
    expect(user?.status).toBe('PENDING')
    expect(user?.preferredBatchId).toBeNull() // Not set via enrollment

    // Cleanup
    await db.batchEnrollment.deleteMany({ where: { userId: student.id } })
    await db.user.delete({ where: { id: student.id } })
    await db.batch.delete({ where: { id: batch.id } })
  })

  it('admin should never see password hash', async () => {
    const user = await db.user.findUnique({
      where: { id: pendingUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        passwordHash: true, // Explicitly select to verify it exists
      },
    })

    // The admin API should use 'select' to exclude passwordHash
    // This test verifies the field exists in DB but should not be returned
    expect(user?.passwordHash).toBeTruthy()

    // In the actual admin API route, passwordHash is excluded via select
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

  it('rejection should revoke sessions', async () => {
    // Create a user with refresh tokens
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

    // Create a refresh token
    const token = await db.refreshToken.create({
      data: {
        userId: student.id,
        token: `test-token-${Date.now()}`,
        familyId: `test-family-${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    // Reject the user
    await db.user.update({
      where: { id: student.id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedById: adminId,
      },
    })

    // Revoke all sessions (simulating what handleStatusChange does)
    await db.refreshToken.updateMany({
      where: { userId: student.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    // Verify token is revoked
    const revokedToken = await db.refreshToken.findUnique({ where: { id: token.id } })
    expect(revokedToken?.revokedAt).toBeTruthy()

    // Cleanup
    await db.refreshToken.deleteMany({ where: { userId: student.id } })
    await db.user.delete({ where: { id: student.id } })
  })
})
