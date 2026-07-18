import { NextRequest } from 'next/server'
import { getPublicSettings } from '@/lib/settings'
import { ok, PUBLIC_CACHE_HEADERS } from '@/lib/api-response'

export async function GET(_req: NextRequest) {
  const settings = await getPublicSettings()
  return ok({ settings }, 'Public settings', undefined, 200, PUBLIC_CACHE_HEADERS)
}
