/**
 * Shared types used across domain services.
 */

import { Prisma } from '@prisma/client'
import type { AuthContext } from '@/lib/auth'

/** Prisma transaction client type — used as the first param of every service method. */
export type TxClient = Prisma.TransactionClient

/** Minimal auth context that domain services need for audit logging. */
export interface AuditContext {
  userId: string
  role: 'ADMIN' | 'STUDENT'
  name?: string
  email?: string
  status?: string
  ip?: string
  userAgent?: string
  requestId?: string
}

/**
 * Convert an AuditContext to the AuthContext format expected by the audit function.
 */
export function toAuditAuth(ctx: AuditContext): AuthContext {
  return {
    user: {
      id: ctx.userId,
      role: ctx.role,
      name: ctx.name || '',
      email: ctx.email || '',
      status: ctx.status || 'ACTIVE',
      mustChangePassword: false,
    },
    ip: ctx.ip || '',
    userAgent: ctx.userAgent || '',
    requestId: ctx.requestId || '',
  }
}

/** Result of a batch-course assignment operation. */
export interface AssignmentResult {
  added: number
  removed: number
}

/** Result of an enrollment operation. */
export interface EnrollmentResult {
  enrolled: number
  skipped: number
  batchId: string
}

/** Batch membership info returned by access checks. */
export interface BatchMembership {
  batchId: string
  batchName: string
  enrolledAt: Date
}

/** Content hierarchy path for validation. */
export interface HierarchyPath {
  courseId: string
  chapterId?: string
  topicId?: string
}

/** Test publication validation result. */
export interface PublicationCheck {
  valid: boolean
  errors: string[]
}

/** Leaderboard entry. */
export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  email: string
  avgScore: number
  bestScore: number
  testsTaken: number
  totalAttempts: number
  totalTime: number
}

/** Video progress record shape. */
export interface VideoProgressData {
  position: number
  percent: number
  completed: boolean
  completedAt: Date | null
  lastWatchedAt: Date
}

/** Pagination result shape. */
export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
