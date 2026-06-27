import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { topicSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const chapter = await db.chapter.findUnique({
    where: { id },
    include: { topics: { orderBy: { order: 'asc' } } },
  })
  if (!chapter) return notFound('Chapter not found')
  return ok({ topics: chapter.topics }, 'Topics list')
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
  const parsed = topicSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const chapter = await db.chapter.findUnique({ where: { id } })
  if (!chapter) return notFound('Chapter not found')

  const maxOrder = await db.topic.aggregate({ where: { chapterId: id }, _max: { order: true } })
  const order = parsed.data.order ?? (maxOrder._max.order ?? -1) + 1
  const topic = await db.topic.create({
    data: { chapterId: id, title: parsed.data.title, order },
  })
  await audit({ ctx, action: 'TOPIC_CREATED', entityType: 'TOPIC', entityId: topic.id, after: { chapterId: id, title: topic.title } })
  return ok({ topic }, 'Topic created', undefined, 201)
}
