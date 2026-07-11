import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireStudent } from '@/lib/auth'
import { ok, fromZodError, unauthorized, notFound, fail } from '@/lib/api-response'
import { profileUpdateSchema } from '@/lib/validation'

// GET — works for any student (even pending/blocked) so they can view their profile
export async function GET(req: NextRequest) {
  const ctx = await requireStudent(req)
  if (!ctx) return unauthorized()

  const user = await db.user.findUnique({
    where: { id: ctx.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      photo: true,
      role: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { enrollments: true, testAttempts: true, videoProgress: true } },
    },
  })
  if (!user) return notFound('User not found')

  const enrollments = await db.batchEnrollment.findMany({
    where: { userId: ctx.user.id },
    include: { batch: { select: { id: true, name: true, slug: true, status: true } } },
  })

  return ok({ user: { ...user, enrollments } }, 'Profile')
}

const patchSchema = profileUpdateSchema

export async function PATCH(req: NextRequest) {
  const ctx = await requireStudent(req)
  if (!ctx) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const data: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone || null
  if (parsed.data.photo !== undefined) data.photo = parsed.data.photo || null

  const updated = await db.user.update({ where: { id: ctx.user.id }, data })
  return ok(
    {
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        photo: updated.photo,
        status: updated.status,
      },
    },
    'Profile updated'
  )
}
