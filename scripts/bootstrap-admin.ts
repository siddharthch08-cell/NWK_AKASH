import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

function writeLine(message: string) {
  process.stdout.write(`${message}\n`)
}

async function createAdmin(email: string, password: string, name: string) {
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    writeLine(`Skipping ${email}: account already exists`)
    return false
  }
  await db.user.create({
    data: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      status: 'ACTIVE',
      termsAccepted: true,
      mustChangePassword: true,
    },
  })
  writeLine(`Admin created: ${email} (password change required at first login)`)
  return true
}

async function main() {
  const password = process.env.ADMIN_INITIAL_PASSWORD
  if (!password) throw new Error('ADMIN_INITIAL_PASSWORD is required')
  if (password.length < 12) throw new Error('ADMIN_INITIAL_PASSWORD must be at least 12 characters')
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('ADMIN_INITIAL_PASSWORD must include uppercase, lowercase, and a number')
  }

  // Support multiple emails via ADMIN_EMAILS (comma-separated) or ADMIN_EMAIL
  const emailsRaw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL
  if (!emailsRaw) throw new Error('ADMIN_EMAILS or ADMIN_EMAIL is required')

  const emails = emailsRaw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0)

  if (emails.length === 0) throw new Error('At least one admin email is required')

  for (const email of emails) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new Error(`Invalid email: ${email}`)
    }
  }

  const name = process.env.ADMIN_NAME?.trim() || 'System Administrator'
  let created = 0

  for (const email of emails) {
    const ok = await createAdmin(email, password, name)
    if (ok) created++
  }

  writeLine(`Bootstrap complete: ${created}/${emails.length} admin(s) created`)
}

main().finally(() => db.$disconnect())
