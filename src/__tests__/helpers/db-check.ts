import { PrismaClient } from '@prisma/client'

let dbAvailable = false

export async function checkDatabase(): Promise<boolean> {
  try {
    const db = new PrismaClient()
    await db.$queryRaw`SELECT 1`
    await db.$disconnect()
    dbAvailable = true
    return true
  } catch {
    dbAvailable = false
    return false
  }
}

export function isDbAvailable(): boolean {
  return dbAvailable
}
