import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok } from '@/lib/api-response'

export async function GET(_req: NextRequest) {
  const now = new Date()
  const announcements = await db.announcement.findMany({
    where: {
      status: 'PUBLISHED',
      audience: 'PUBLIC',
      publishAt: { lte: now },
      OR: [{ expireAt: null }, { expireAt: { gt: now } }],
    },
    orderBy: [{ pinned: 'desc' }, { publishAt: 'desc' }],
    take: 20,
    select: {
      id: true,
      title: true,
      message: true,
      priority: true,
      pinned: true,
      publishAt: true,
    },
  })
  return ok({ announcements }, 'Public announcements')
}
