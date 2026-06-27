import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { chapterSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const course = await db.course.findUnique({
    where: { id },
    include: { chapters: { orderBy: { order: 'asc' } } },
  })
  if (!course) return notFound('Course not found')
  return ok({ chapters: course.chapters }, 'Chapters list')
}

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = chapterSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const course = await db.course.findUnique({ where: { id } })
  if (!course) return notFound('Course not found')

  const maxOrder = await db.chapter.aggregate({ where: { courseId: id }, _max: { order: true } })
  const order = parsed.data.order ?? (maxOrder._max.order ?? -1) + 1
  const chapter = await db.chapter.create({
    data: { courseId: id, title: parsed.data.title, order },
  })
  await audit({ ctx, action: 'CHAPTER_CREATED', entityType: 'CHAPTER', entityId: chapter.id, after: { courseId: id, title: chapter.title } })
  return ok({ chapter }, 'Chapter created', undefined, 201)
}
