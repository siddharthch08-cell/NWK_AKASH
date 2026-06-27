import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok } from '@/lib/api-response'

export async function GET(_req: NextRequest) {
  const [students, batches, courses, videos, tests] = await Promise.all([
    db.user.count({ where: { role: 'STUDENT', status: { in: ['ACTIVE', 'APPROVED', 'PENDING'] } } }),
    db.batch.count({ where: { status: 'ACTIVE' } }),
    db.course.count({ where: { status: 'PUBLISHED' } }),
    db.video.count({ where: { status: 'PUBLISHED' } }),
    db.test.count({ where: { status: 'PUBLISHED' } }),
  ])
  return ok({ students, batches, courses, videos, tests }, 'Public stats')
}
