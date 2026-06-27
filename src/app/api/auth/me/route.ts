import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthContext } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return unauthorized('Not authenticated')

  const user = await db.user.findUnique({
    where: { id: ctx.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      phone: true,
      photo: true,
      rejectionReason: true,
      lastLoginAt: true,
      createdAt: true,
    },
  })
  if (!user) return unauthorized('Not authenticated')

  return ok({ user }, 'Session valid')
}
