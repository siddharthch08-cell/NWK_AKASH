import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, fromZodError, unauthorized, fail } from '@/lib/api-response'
import { settingsSchema } from '@/lib/validation'
import { audit } from '@/lib/audit'
import { getSettings } from '@/lib/settings'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()
  const settings = await getSettings()
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
  const updated = await db.instituteSetting.upsert({
    where: { id: 'singleton' },
    update: { ...parsed.data, updatedBy: ctx.user.id },
    create: { id: 'singleton', ...parsed.data, updatedBy: ctx.user.id },
  })
  await audit({ ctx, action: 'SETTING_UPDATED', entityType: 'SETTINGS', entityId: 'singleton', before: existing, after: updated })

  return ok({ settings: updated }, 'Settings updated')
}
