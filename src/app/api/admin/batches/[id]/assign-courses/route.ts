import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail, fromZodError } from '@/lib/api-response'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({ courseIds: z.array(z.string()).min(1) })

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
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const batch = await db.batch.findUnique({ where: { id } })
  if (!batch) return notFound('Batch not found')

  const courses = await db.course.findMany({ where: { id: { in: parsed.data.courseIds } } })
  if (courses.length !== parsed.data.courseIds.length) {
    return fail('NOT_FOUND', 'One or more courses not found', 404)
  }

  let added = 0
  for (const courseId of parsed.data.courseIds) {
    try {
      await db.batchCourse.create({ data: { batchId: id, courseId } })
      added++
    } catch {
      // duplicate — skip
    }
  }
  return ok({ added }, `Assigned ${added} course(s)`)
}
