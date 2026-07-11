import { NextRequest } from 'next/server'
import { requireActiveStudent } from '@/lib/auth'
import { ok, unauthorized, fail } from '@/lib/api-response'
import { LeaderboardService } from '@/domain'
import { DomainError } from '@/domain/errors'

export async function GET(req: NextRequest) {
  const ctx = await requireActiveStudent(req)
  if (!ctx) return unauthorized()

  const url = new URL(req.url)
  const batchId = url.searchParams.get('batchId') || undefined

  try {
    const { leaderboard, myRank } = await LeaderboardService.computeStudentLeaderboard(
      ctx.user.id,
      batchId,
    )
    return ok({ leaderboard, myRank }, 'Leaderboard')
  } catch (e) {
    if (e instanceof DomainError) {
      return fail(e.code, e.message, e.status, e.fields)
    }
    throw e
  }
}
