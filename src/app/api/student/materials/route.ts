import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'
import { Prisma } from '@prisma/client'
import { StudentContentAccessPolicy } from '@/domain'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  const url = new URL(req.url)
  const courseId = url.searchParams.get('courseId')
  const chapterId = url.searchParams.get('chapterId')
  const topicId = url.searchParams.get('topicId')
  const materialType = url.searchParams.get('materialType')
  const platform = url.searchParams.get('platform')
  const search = url.searchParams.get('search')

  // Get student's accessible batches (ACTIVE only)
  const accessibleCourseIds = await StudentContentAccessPolicy.getAccessibleCourseIds(ctx.user.id)

  if (accessibleCourseIds.length === 0) return ok({ materials: [] }, 'No materials available')

  // Build where clause — always intersect with authorized course set
  const where: Prisma.MaterialWhereInput = {
    published: true,
    archived: false,
    course: { status: 'PUBLISHED' },
    chapter: { archivedAt: null },
    OR: [{ topicId: null }, { topic: { archivedAt: null } }],
  }

  // If courseId filter is provided, validate it's in the authorized set
  if (courseId) {
    if (!accessibleCourseIds.includes(courseId)) {
      return ok({ materials: [] }, 'No materials available')
    }
    where.courseId = courseId
  } else {
    where.courseId = { in: accessibleCourseIds }
  }
  if (chapterId) where.chapterId = chapterId
  if (topicId) where.topicId = topicId
  if (materialType) where.materialType = materialType
  if (platform) where.platform = platform
  if (search) where.title = { contains: search }

  const materials = await db.material.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      course: { select: { id: true, title: true } },
      chapter: { select: { id: true, title: true } },
      topic: { select: { id: true, title: true } },
    },
  })

  return ok({ materials }, 'Study Materials')
}
