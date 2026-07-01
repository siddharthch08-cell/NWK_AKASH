import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail, fromZodError } from '@/lib/api-response'
import { audit } from '@/lib/audit'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({
  attemptIds: z.array(z.string()).optional(), // specific attempts; if omitted, publish ALL submitted for this test
})

/**
 * POST /api/admin/tests/[id]/publish-results
 * Publish results for a test. If attemptIds provided, publish those; otherwise publish ALL submitted-but-unpublished.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch { body = {} }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const test = await db.test.findUnique({ where: { id } })
  if (!test) return notFound('Test not found')

  const where = parsed.data.attemptIds?.length
    ? { testId: id, status: 'SUBMITTED', id: { in: parsed.data.attemptIds }, resultPublishedAt: null }
    : { testId: id, status: 'SUBMITTED', resultPublishedAt: null }

  const result = await db.testAttempt.updateMany({
    where,
    data: { resultPublishedAt: new Date() },
  })

  await audit({ ctx, action: 'RESULT_PUBLISHED', entityType: 'TEST', entityId: id, after: { publishedCount: result.count } })

  return ok({ publishedCount: result.count }, `Published ${result.count} result(s)`)
}
