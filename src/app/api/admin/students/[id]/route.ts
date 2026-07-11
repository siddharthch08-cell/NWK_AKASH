import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound, fail, fromZodError } from '@/lib/api-response'
import { z } from 'zod'
import { audit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const user = await db.user.findFirst({
    where: { id, role: 'STUDENT' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      photo: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      preferredBatchId: true,
      enrollments: {
        include: {
          batch: { select: { id: true, name: true, slug: true, status: true } },
        },
      },
      testAttempts: {
        take: 20,
        orderBy: { startedAt: 'desc' },
        include: { test: { select: { id: true, title: true } } },
      },
      videoProgress: {
        take: 20,
        orderBy: { lastWatchedAt: 'desc' },
        include: { video: { select: { id: true, title: true } } },
      },
      _count: {
        select: { testAttempts: true, videoProgress: true, enrollments: true },
      },
    },
  })
  if (!user) return notFound('Student not found')

  return ok({ student: user }, 'Student profile')
}

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().max(20).optional().nullable(),
  photo: z.string().url().optional().nullable().or(z.literal('')),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const user = await db.user.findFirst({ where: { id, role: 'STUDENT' } })
  if (!user) return notFound('Student not found')

  const data: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone || null
  if (parsed.data.photo !== undefined) data.photo = parsed.data.photo || null

  const updated = await db.user.update({ where: { id }, data })
  return ok({ student: { id: updated.id, name: updated.name, phone: updated.phone, photo: updated.photo } }, 'Student updated')
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params

  const user = await db.user.findFirst({
    where: { id, role: 'STUDENT' },
    include: { _count: { select: { testAttempts: true, videoProgress: true } } },
  })
  if (!user) return notFound('Student not found')

  // Prevent hard delete if there's academic history — soft-delete only
  if (user._count.testAttempts > 0 || user._count.videoProgress > 0) {
    await db.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } })
    await audit({ ctx, action: 'STUDENT_DEACTIVATED', entityType: 'USER', entityId: id, after: { deletedAt: new Date().toISOString() } })
    return ok({}, 'Student has academic history. Account has been archived (soft-deleted).')
  }

  // No history — safe to soft-delete
  await db.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } })
  await audit({ ctx, action: 'STUDENT_DEACTIVATED', entityType: 'USER', entityId: id })
  return ok({}, 'Student archived')
}
