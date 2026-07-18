import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

function writeLine(message: string) {
  process.stdout.write(`${message}\n`)
}
const known = ['Admin@12345', 'Student@12345', 'password', 'changeme']

async function main() {
  const users = await db.user.findMany({ where: { role: 'ADMIN', deletedAt: null }, select: { email: true, passwordHash: true } })
  for (const user of users) {
    for (const candidate of known) if (await bcrypt.compare(candidate, user.passwordHash)) throw new Error(`Administrator ${user.email} still uses a known default credential`)
  }
  writeLine(`Default credential audit passed for ${users.length} administrator(s)`)
}

main().finally(() => db.$disconnect())
