import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const integrity = await db.$queryRawUnsafe<Array<Record<string, string>>>('PRAGMA integrity_check')
  if (integrity.length !== 1 || Object.values(integrity[0])[0] !== 'ok') {
    throw new Error(`SQLite integrity check failed: ${JSON.stringify(integrity)}`)
  }
  const foreignKeys = await db.$queryRawUnsafe<Array<Record<string, unknown>>>('PRAGMA foreign_key_check')
  if (foreignKeys.length) throw new Error(`Foreign-key check found ${foreignKeys.length} violation(s)`)

  const orphanRows = await db.$queryRawUnsafe<Array<{ count: bigint }>>(`
    SELECT
      (SELECT COUNT(*) FROM BatchEnrollment WHERE userId NOT IN (SELECT id FROM User) OR batchId NOT IN (SELECT id FROM Batch)) +
      (SELECT COUNT(*) FROM BatchCourse WHERE batchId NOT IN (SELECT id FROM Batch) OR courseId NOT IN (SELECT id FROM Course)) +
      (SELECT COUNT(*) FROM AttemptAnswer WHERE attemptId NOT IN (SELECT id FROM TestAttempt) OR questionId NOT IN (SELECT id FROM Question))
      AS count
  `)
  const orphanCount = Number(orphanRows[0]?.count || 0)
  if (orphanCount) throw new Error(`Critical relation validation found ${orphanCount} orphan(s)`)

  const counts = await Promise.all([
    db.user.count(),
    db.batch.count(),
    db.course.count(),
    db.batchEnrollment.count(),
    db.batchCourse.count(),
    db.testAttempt.count(),
    db.attemptAnswer.count(),
  ])
  console.log(`Database checks passed; rows user=${counts[0]} batch=${counts[1]} course=${counts[2]} enrollment=${counts[3]} batchCourse=${counts[4]} attempt=${counts[5]} answer=${counts[6]}`)
}

main().finally(() => db.$disconnect())
