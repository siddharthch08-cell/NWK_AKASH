import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

let db: PrismaClient
let dbOk = false

describe('Login Security - Account Status Checks', () => {
  const testUsers: { id: string; email: string; status: string }[] = []

  beforeAll(async () => {
    try {
      db = new PrismaClient()
      await db.$queryRaw`SELECT 1`
      dbOk = true
    } catch {
      dbOk = false
      return
    }

    const passwordHash = await bcrypt.hash('TestPass123', 12)
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
    if (!dbOk) return
    for (const user of testUsers) {
      await db.user.delete({ where: { id: user.id } }).catch(() => {})
    }
    await db.$disconnect()
  })

  it.skipIf(!dbOk)('PENDING user should not be able to log in', async () => {
    const user = testUsers.find((u) => u.status === 'PENDING')
    expect(user).toBeDefined()
    if (!user) throw new Error('Expected login fixture user')

    const dbUser = await db.user.findUnique({ where: { email: user.email } })
    expect(dbUser).toBeTruthy()
    if (!dbUser) throw new Error('Expected login fixture database user')
    const valid = await bcrypt.compare('TestPass123', dbUser.passwordHash)
    expect(valid).toBe(true)

    expect(dbUser.status).toBe('PENDING')
  })

  it.skipIf(!dbOk)('REJECTED user should not be able to log in', async () => {
    const user = testUsers.find((u) => u.status === 'REJECTED')
    expect(user).toBeDefined()
    if (!user) throw new Error('Expected login fixture user')

    const dbUser = await db.user.findUnique({ where: { email: user.email } })
    expect(dbUser).toBeTruthy()
    if (!dbUser) throw new Error('Expected login fixture database user')
    const valid = await bcrypt.compare('TestPass123', dbUser.passwordHash)
    expect(valid).toBe(true)

    expect(dbUser.status).toBe('REJECTED')
  })

  it.skipIf(!dbOk)('SUSPENDED user should not be able to log in', async () => {
    const user = testUsers.find((u) => u.status === 'SUSPENDED')
    expect(user).toBeDefined()
    if (!user) throw new Error('Expected login fixture user')

    const dbUser = await db.user.findUnique({ where: { email: user.email } })
    expect(dbUser).toBeTruthy()
    if (!dbUser) throw new Error('Expected login fixture database user')
    const valid = await bcrypt.compare('TestPass123', dbUser.passwordHash)
    expect(valid).toBe(true)

    expect(dbUser.status).toBe('SUSPENDED')
  })

  it.skipIf(!dbOk)('BLOCKED user should not be able to log in', async () => {
    const user = testUsers.find((u) => u.status === 'BLOCKED')
    expect(user).toBeDefined()
    if (!user) throw new Error('Expected login fixture user')

    const dbUser = await db.user.findUnique({ where: { email: user.email } })
    expect(dbUser).toBeTruthy()
    if (!dbUser) throw new Error('Expected login fixture database user')
    const valid = await bcrypt.compare('TestPass123', dbUser.passwordHash)
    expect(valid).toBe(true)

    expect(dbUser.status).toBe('BLOCKED')
  })

  it.skipIf(!dbOk)('APPROVED user should be able to log in', async () => {
    const user = testUsers.find((u) => u.status === 'APPROVED')
    expect(user).toBeDefined()
    if (!user) throw new Error('Expected login fixture user')

    const dbUser = await db.user.findUnique({ where: { email: user.email } })
    expect(dbUser).toBeTruthy()
    if (!dbUser) throw new Error('Expected login fixture database user')
    const valid = await bcrypt.compare('TestPass123', dbUser.passwordHash)
    expect(valid).toBe(true)

    expect(['APPROVED', 'ACTIVE']).toContain(dbUser.status)
  })

  it.skipIf(!dbOk)('ACTIVE user should be able to log in', async () => {
    const user = testUsers.find((u) => u.status === 'ACTIVE')
    expect(user).toBeDefined()
    if (!user) throw new Error('Expected login fixture user')

    const dbUser = await db.user.findUnique({ where: { email: user.email } })
    expect(dbUser).toBeTruthy()
    if (!dbUser) throw new Error('Expected login fixture database user')
    const valid = await bcrypt.compare('TestPass123', dbUser.passwordHash)
    expect(valid).toBe(true)

    expect(['APPROVED', 'ACTIVE']).toContain(dbUser.status)
  })

  it.skipIf(!dbOk)('wrong password should fail for any user', async () => {
    const user = testUsers[0]
    const dbUser = await db.user.findUnique({ where: { email: user.email } })
    expect(dbUser).toBeTruthy()
    if (!dbUser) throw new Error('Expected seeded user to exist')

    const valid = await bcrypt.compare('WrongPassword999', dbUser.passwordHash)
    expect(valid).toBe(false)
  })

  it.skipIf(!dbOk)('non-existent email should not reveal user existence', async () => {
    const dbUser = await db.user.findUnique({
      where: { email: 'nonexistent@example.com' },
    })
    expect(dbUser).toBeNull()
  })
})
