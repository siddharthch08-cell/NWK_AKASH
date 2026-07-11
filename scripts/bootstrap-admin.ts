import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_INITIAL_PASSWORD
  const name = process.env.ADMIN_NAME?.trim() || 'System Administrator'
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD are required')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('ADMIN_EMAIL must be a valid email address')
  if (password.length < 12) throw new Error('ADMIN_INITIAL_PASSWORD must be at least 12 characters')
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('ADMIN_INITIAL_PASSWORD must include uppercase, lowercase, and a number')
  }
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) throw new Error('An account with ADMIN_EMAIL already exists; bootstrap will not overwrite it')
  await db.user.create({ data: { email, name, passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN', status: 'ACTIVE', termsAccepted: true, mustChangePassword: true } })
  console.log(`Bootstrap administrator created for ${email}; password change is required at first login.`)
}

main().finally(() => db.$disconnect())
