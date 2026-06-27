import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  const now = new Date()
  const announcements = await db.announcement.findMany({
    where: {
      status: 'PUBLISHED',
      publishAt: { lte: now },
      OR: [{ expireAt: null }, { expireAt: { gt: now } }],
      OR: [
        { audience: 'ALL_STUDENTS' },
        {
          audience: 'BATCH',
          batches: {
            some: {
              batch: { enrollments: { some: { userId: ctx.user.id } } },
            },
          },
        },
      ],
    },
    orderBy: [{ pinned: 'desc' }, { publishAt: 'desc' }],
    take: 30,
    select: {
      id: true,
      title: true,
      message: true,
      priority: true,
      pinned: true,
      publishAt: true,
    },
  })

  return ok({ announcements }, 'My announcements')
}
