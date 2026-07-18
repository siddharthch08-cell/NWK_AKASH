import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

function writeLine(message: string) {
  process.stdout.write(`${message}\n`)
}

async function main() {
  // PostgreSQL: verify connection is alive
  await db.$queryRaw`SELECT 1`

  // Check foreign key constraints via Prisma raw query
  const orphanRows = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT
      (SELECT COUNT(*)::int FROM "BatchEnrollment" WHERE "userId" NOT IN (SELECT id FROM "User") OR "batchId" NOT IN (SELECT id FROM "Batch")) +
      (SELECT COUNT(*)::int FROM "BatchCourse" WHERE "batchId" NOT IN (SELECT id FROM "Batch") OR "courseId" NOT IN (SELECT id FROM "Course")) +
      (SELECT COUNT(*)::int FROM "AttemptAnswer" WHERE "attemptId" NOT IN (SELECT id FROM "TestAttempt") OR "questionId" NOT IN (SELECT id FROM "Question"))
      AS count
  `
  const orphanCount = Number(orphanRows[0]?.count || 0)
  if (orphanCount) throw new Error(`Relation validation found ${orphanCount} orphan(s)`)

  const counts = await Promise.all([
    db.user.count(),
    db.batch.count(),
    db.course.count(),
    db.batchEnrollment.count(),
    db.batchCourse.count(),
    db.testAttempt.count(),
    db.attemptAnswer.count(),
  ])
  writeLine(`Database checks passed; rows user=${counts[0]} batch=${counts[1]} course=${counts[2]} enrollment=${counts[3]} batchCourse=${counts[4]} attempt=${counts[5]} answer=${counts[6]}`)
}

main().finally(() => db.$disconnect())
