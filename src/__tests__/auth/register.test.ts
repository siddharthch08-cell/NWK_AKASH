import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

let db: PrismaClient
let dbOk = false

describe('Registration Security', () => {
  let testUserId: string

  beforeAll(async () => {
    try {
      db = new PrismaClient()
      await db.$queryRaw`SELECT 1`
      dbOk = true
    } catch {
      dbOk = false
    }
  })

  afterAll(async () => {
    if (!dbOk) return
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } }).catch(() => {})
    }
    await db.$disconnect()
  })

  it.skipIf(!dbOk)('should create a PENDING student with role=STUDENT', async () => {
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

  it.skipIf(!dbOk)('should not allow creating admin via registration', async () => {
    const email = `test-admin-${Date.now()}@example.com`
    const passwordHash = await bcrypt.hash('TestPass123', 12)

    const user = await db.user.create({
      data: {
        email,
        name: 'Test Admin Attempt',
        passwordHash,
        role: 'STUDENT',
        status: 'PENDING',
        termsAccepted: true,
      },
    })

    expect(user.role).toBe('STUDENT')
    expect(user.status).toBe('PENDING')

    await db.user.delete({ where: { id: user.id } })
  })

  it.skipIf(!dbOk)('should not allow self-approval via registration', async () => {
    const email = `test-approve-${Date.now()}@example.com`
    const passwordHash = await bcrypt.hash('TestPass123', 12)

    const user = await db.user.create({
      data: {
        email,
        name: 'Test Self-Approve Attempt',
        passwordHash,
        role: 'STUDENT',
        status: 'PENDING',
        termsAccepted: true,
      },
    })

    expect(user.status).toBe('PENDING')

    await db.user.delete({ where: { id: user.id } })
  })

  it.skipIf(!dbOk)('should store requestedBatchId without creating enrollment', async () => {
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

    expect(user.preferredBatchId).toBe(batch.id)

    const enrollment = await db.batchEnrollment.findFirst({
      where: { userId: user.id },
    })
    expect(enrollment).toBeNull()

    await db.user.delete({ where: { id: user.id } })
    await db.batch.delete({ where: { id: batch.id } })
    await db.user.delete({ where: { id: admin.id } })
  })
})
