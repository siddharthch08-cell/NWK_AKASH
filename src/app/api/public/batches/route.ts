import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, PUBLIC_CACHE_HEADERS } from '@/lib/api-response'

export async function GET(_req: NextRequest) {
  // Only show batches that are publicly previewable: ACTIVE or UPCOMING
  const batches = await db.batch.findMany({
    where: { status: { in: ['ACTIVE', 'UPCOMING'] } },
    orderBy: [{ status: 'asc' }, { startDate: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      thumbnail: true,
      startDate: true,
      endDate: true,
      status: true,
      capacity: true,
      _count: { select: { enrollments: true } },
    },
  })
  return ok(
    {
      batches: batches.map((b) => ({
        ...b,
        enrolledCount: b._count.enrollments,
        _count: undefined,
      })),
    },
    'Public batches',
    undefined,
    200,
    PUBLIC_CACHE_HEADERS,
  )
}
