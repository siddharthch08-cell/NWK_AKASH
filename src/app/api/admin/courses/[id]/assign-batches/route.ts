import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({ batchIds: z.array(z.string()).default([]) })

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

  const course = await db.course.findUnique({ where: { id } })
  if (!course) return notFound('Course not found')

  const batches = await db.batch.findMany({ where: { id: { in: parsed.data.batchIds } } })
  if (batches.length !== parsed.data.batchIds.length) return fail('NOT_FOUND', 'One or more batches not found', 404)

  let added = 0
  for (const batchId of parsed.data.batchIds) {
    try {
      await db.batchCourse.create({ data: { batchId, courseId: id } })
      added++
    } catch {
      // duplicate
    }
  }
  return ok({ added }, `Assigned course to ${added} batch(es)`)
}
