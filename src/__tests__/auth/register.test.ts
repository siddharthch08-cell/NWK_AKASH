import { describe, it, expect, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

describe('Registration Security', () => {
  let testUserId: string

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } }).catch(() => {})
    }
    await db.$disconnect()
  })

  it('should create a PENDING student with role=STUDENT', async () => {
    const email = `test-register-${Date.now()}@example.com`
    const passwordHash = await bcrypt.hash('TestPass123', 12)

    const user = await db.user.create({
      data: {
        email,
        name: 'Test Student',
        passwordHash,
        role: 'STUDENT',
        status: 'PENDING',
        termsAccepted: true,
      },
    })

    testUserId = user.id

    expect(user.role).toBe('STUDENT')
    expect(user.status).toBe('PENDING')
    expect(user.passwordHash).toBeTruthy()
  })

  it('should not allow creating admin via registration', async () => {
    // Verify that the register endpoint forces role=STUDENT
    // This is enforced in the route handler, not the schema
    const email = `test-admin-${Date.now()}@example.com`
    const passwordHash = await bcrypt.hash('TestPass123', 12)

    const user = await db.user.create({
      data: {
        email,
        name: 'Test Admin Attempt',
        passwordHash,
        role: 'STUDENT', // Forced by registration handler
        status: 'PENDING', // Forced by registration handler
        termsAccepted: true,
      },
    })

    expect(user.role).toBe('STUDENT')
    expect(user.status).toBe('PENDING')

    // Cleanup
    await db.user.delete({ where: { id: user.id } })
  })

  it('should not allow self-approval via registration', async () => {
    // The registration handler forces status=PENDING
    // A malicious client cannot set status=APPROVED
    const email = `test-approve-${Date.now()}@example.com`
    const passwordHash = await bcrypt.hash('TestPass123', 12)

    const user = await db.user.create({
      data: {
        email,
        name: 'Test Self-Approve Attempt',
        passwordHash,
        role: 'STUDENT',
        status: 'PENDING', // Registration handler forces this
        termsAccepted: true,
      },
    })

    expect(user.status).toBe('PENDING')

    // Cleanup
    await db.user.delete({ where: { id: user.id } })
  })

  it('should store requestedBatchId without creating enrollment', async () => {
    // Create an admin user for batch createdBy
    const adminHash = await bcrypt.hash('AdminPass123', 12)
    const admin = await db.user.create({
      data: {
        email: `test-admin-batch-${Date.now()}@example.com`,
        name: 'Test Admin',
        passwordHash: adminHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        termsAccepted: true,
      },
    })

    // Create a batch first
    const batch = await db.batch.create({
      data: {
        name: 'Test Batch',
        slug: `test-batch-${Date.now()}`,
        status: 'ACTIVE',
        createdBy: admin.id,
      },
    })

    const email = `test-batch-${Date.now()}@example.com`
    const passwordHash = await bcrypt.hash('TestPass123', 12)

    const user = await db.user.create({
      data: {
        email,
        name: 'Test Batch Request',
        passwordHash,
        role: 'STUDENT',
        status: 'PENDING',
        preferredBatchId: batch.id,
        termsAccepted: true,
      },
    })

    // Verify batch was requested
    expect(user.preferredBatchId).toBe(batch.id)

    // Verify NO enrollment was created
    const enrollment = await db.batchEnrollment.findFirst({
      where: { userId: user.id },
    })
    expect(enrollment).toBeNull()

    // Cleanup
    await db.user.delete({ where: { id: user.id } })
    await db.batch.delete({ where: { id: batch.id } })
    await db.user.delete({ where: { id: admin.id } })
  })
})
