import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound } from '@/lib/api-response'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const test = await db.test.findUnique({
    where: { id },
    include: { questions: { include: { options: true } }, batches: true },
  })
  if (!test) return notFound('Test not found')

  // Duplicate the test (DRAFT) and its questions + batch assignments
  const { id: _omit, createdAt: _c, updatedAt: _u, publishedAt: _p, ...testData } = test
  const dup = await db.test.create({
    data: {
      ...testData,
      title: `${test.title} (Copy)`,
      status: 'DRAFT',
      publishedAt: null,
      createdBy: ctx.user.id,
      batches: {
        create: test.batches.map((tb) => ({ batchId: tb.batchId })),
      },
      questions: {
        create: test.questions.map((q) => ({
          text: q.text,
          explanation: q.explanation,
          marks: q.marks,
          order: q.order,
          options: {
            create: q.options.map((o) => ({
              text: o.text,
              isCorrect: o.isCorrect,
              order: o.order,
            })),
          },
        })),
      },
    },
  })
  await audit({ ctx, action: 'TEST_CREATED', entityType: 'TEST', entityId: dup.id, after: { title: dup.title, duplicatedFrom: id } })
  return ok({ test: dup }, 'Test duplicated', undefined, 201)
}
