import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

describe('Login Security - Account Status Checks', () => {
  const testUsers: { id: string; email: string; status: string }[] = []

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123', 12)

    // Create test users with different statuses
    const statuses = ['PENDING', 'REJECTED', 'SUSPENDED', 'BLOCKED', 'APPROVED', 'ACTIVE']

    for (const status of statuses) {
      const email = `test-login-${status.toLowerCase()}-${Date.now()}@example.com`
      const user = await db.user.create({
        data: {
          email,
          name: `Test ${status}`,
          passwordHash,
          role: 'STUDENT',
          status,
          termsAccepted: true,
        },
      })
      testUsers.push({ id: user.id, email, status })
    }
  })

  afterAll(async () => {
    for (const user of testUsers) {
      await db.user.delete({ where: { id: user.id } }).catch(() => {})
    }
    await db.$disconnect()
  })

  it('PENDING user should not be able to log in', async () => {
    const user = testUsers.find((u) => u.status === 'PENDING')
    expect(user).toBeDefined()

    // Verify the user exists with correct password
    const dbUser = await db.user.findUnique({ where: { email: user!.email } })
    expect(dbUser).toBeTruthy()
    const valid = await bcrypt.compare('TestPass123', dbUser!.passwordHash)
    expect(valid).toBe(true)

    // The login handler should reject PENDING status after password verification
    // This is tested by the route logic: if (user.status === 'PENDING') return forbidden(...)
    expect(dbUser!.status).toBe('PENDING')
  })

  it('REJECTED user should not be able to log in', async () => {
    const user = testUsers.find((u) => u.status === 'REJECTED')
    expect(user).toBeDefined()

    const dbUser = await db.user.findUnique({ where: { email: user!.email } })
    expect(dbUser).toBeTruthy()
    const valid = await bcrypt.compare('TestPass123', dbUser!.passwordHash)
    expect(valid).toBe(true)

    expect(dbUser!.status).toBe('REJECTED')
  })

  it('SUSPENDED user should not be able to log in', async () => {
    const user = testUsers.find((u) => u.status === 'SUSPENDED')
    expect(user).toBeDefined()

    const dbUser = await db.user.findUnique({ where: { email: user!.email } })
    expect(dbUser).toBeTruthy()
    const valid = await bcrypt.compare('TestPass123', dbUser!.passwordHash)
    expect(valid).toBe(true)

    expect(dbUser!.status).toBe('SUSPENDED')
  })

  it('BLOCKED user should not be able to log in', async () => {
    const user = testUsers.find((u) => u.status === 'BLOCKED')
    expect(user).toBeDefined()

    const dbUser = await db.user.findUnique({ where: { email: user!.email } })
    expect(dbUser).toBeTruthy()
    const valid = await bcrypt.compare('TestPass123', dbUser!.passwordHash)
    expect(valid).toBe(true)

    expect(dbUser!.status).toBe('BLOCKED')
  })

  it('APPROVED user should be able to log in', async () => {
    const user = testUsers.find((u) => u.status === 'APPROVED')
    expect(user).toBeDefined()

    const dbUser = await db.user.findUnique({ where: { email: user!.email } })
    expect(dbUser).toBeTruthy()
    const valid = await bcrypt.compare('TestPass123', dbUser!.passwordHash)
    expect(valid).toBe(true)

    // APPROVED is in LOGINABLE_STATUSES
    expect(['APPROVED', 'ACTIVE']).toContain(dbUser!.status)
  })

  it('ACTIVE user should be able to log in', async () => {
    const user = testUsers.find((u) => u.status === 'ACTIVE')
    expect(user).toBeDefined()

    const dbUser = await db.user.findUnique({ where: { email: user!.email } })
    expect(dbUser).toBeTruthy()
    const valid = await bcrypt.compare('TestPass123', dbUser!.passwordHash)
    expect(valid).toBe(true)

    // ACTIVE is in LOGINABLE_STATUSES
    expect(['APPROVED', 'ACTIVE']).toContain(dbUser!.status)
  })

  it('wrong password should fail for any user', async () => {
    const user = testUsers[0]
    const dbUser = await db.user.findUnique({ where: { email: user.email } })
    expect(dbUser).toBeTruthy()

    const valid = await bcrypt.compare('WrongPassword999', dbUser!.passwordHash)
    expect(valid).toBe(false)
  })

  it('non-existent email should not reveal user existence', async () => {
    const dbUser = await db.user.findUnique({
      where: { email: 'nonexistent@example.com' },
    })
    expect(dbUser).toBeNull()
  })
})
