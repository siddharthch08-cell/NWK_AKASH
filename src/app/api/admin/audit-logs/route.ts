import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, unauthorized, parsePagination } from '@/lib/api-response'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req)
  if (!ctx) return unauthorized()

  const p = parsePagination(req)
  const conditions: Prisma.AuditLogWhereInput[] = []
  if (p.search) conditions.push({ action: { contains: String(p.search).toUpperCase() } })
  if (p.action) conditions.push({ action: String(p.action) })
  if (p.entityType) conditions.push({ entityType: String(p.entityType) })
  if (p.actorId) conditions.push({ actorId: String(p.actorId) })
  const where: Prisma.AuditLogWhereInput = conditions.length > 0 ? { AND: conditions } : {}

  const [total, items] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      include: { actor: { select: { name: true, email: true } } },
    }),
  ])

  return ok(
    { items, page: p.page, pageSize: p.pageSize, total, totalPages: Math.max(1, Math.ceil(total / p.pageSize)) },
    'Audit logs'
  )
}
