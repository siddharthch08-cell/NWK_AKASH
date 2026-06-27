import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, fail } from '@/lib/api-response'
import { settingsSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const settings = await db.instituteSetting.findUnique({ where: { id: 'singleton' } })
  return ok({ settings }, 'Settings')
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }
  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const existing = await db.instituteSetting.findUnique({ where: { id: 'singleton' } })
  if (!existing) return fail('NOT_FOUND', 'Settings row not found', 404)

  const updated = await db.instituteSetting.update({
    where: { id: 'singleton' },
    data: { ...parsed.data, updatedBy: ctx.user.id },
  })
  await audit({ ctx, action: 'SETTING_UPDATED', entityType: 'SETTINGS', entityId: 'singleton', before: existing, after: updated })

  return ok({ settings: updated }, 'Settings updated')
}
