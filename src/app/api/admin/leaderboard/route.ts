import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, fail } from '@/lib/api-response'
import { LeaderboardService } from '@/domain'
import { DomainError } from '@/domain/errors'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const url = new URL(req.url)
  const batchId = url.searchParams.get('batchId') || undefined
  const testId = url.searchParams.get('testId') || undefined

  try {
    const leaderboard = await LeaderboardService.computeLeaderboard({ batchId, testId })
    return ok({ leaderboard }, 'Leaderboard')
  } catch (e) {
    if (e instanceof DomainError) {
      return fail(e.code, e.message, e.status, e.fields)
    }
    throw e
  }
}
