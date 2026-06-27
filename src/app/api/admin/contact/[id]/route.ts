import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, notFound } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const message = await db.contactMessage.findUnique({ where: { id } })
  if (!message) return notFound('Message not found')
  if (message.status === 'NEW') {
    await db.contactMessage.update({ where: { id }, data: { status: 'READ' } })
  }
  return ok({ message }, 'Contact message detail')
}
