import { db } from './db'
import type { AuthContext } from './auth'

export type AuditAction =
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGIN_FAILED'
  | 'STUDENT_LOGIN'
  | 'STUDENT_LOGIN_FAILED'
  | 'STUDENT_REGISTER'
  | 'STUDENT_APPROVED'
  | 'STUDENT_REJECTED'
  | 'STUDENT_BLOCKED'
  | 'STUDENT_UNBLOCKED'
  | 'STUDENT_ACTIVATED'
  | 'STUDENT_DEACTIVATED'
  | 'BULK_STUDENT_APPROVED'
  | 'BATCH_CREATED'
  | 'BATCH_UPDATED'
  | 'BATCH_ARCHIVED'
  | 'ENROLLMENT_ASSIGNED'
  | 'ENROLLMENT_REMOVED'
  | 'COURSE_CREATED'
  | 'COURSE_UPDATED'
  | 'COURSE_ARCHIVED'
  | 'CHAPTER_CREATED'
  | 'TOPIC_CREATED'
  | 'VIDEO_CREATED'
  | 'VIDEO_PUBLISHED'
  | 'MATERIAL_UPLOADED'
  | 'MATERIAL_REMOVED'
  | 'TEST_CREATED'
  | 'TEST_PUBLISHED'
  | 'TEST_ARCHIVED'
  | 'ANNOUNCEMENT_PUBLISHED'
  | 'SETTING_UPDATED'
  | 'REPORT_EXPORTED'
  | 'PASSWORD_CHANGED'
  | 'LOGOUT'

export interface AuditInput {
  ctx?: AuthContext | null
  action: AuditAction | string
  entityType?: string
  entityId?: string
  before?: unknown
  after?: unknown
}

export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.ctx?.user.id || null,
        actorRole: input.ctx?.user.role || null,
        action: input.action,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        before: input.before ? safeJson(input.before) : null,
        after: input.after ? safeJson(input.after) : null,
        ip: input.ctx?.ip || null,
        userAgent: input.ctx?.userAgent || null,
        requestId: input.ctx?.requestId || null,
      },
    })
  } catch (e) {
    // Audit failures must NOT corrupt primary operations
    console.error('[audit] failed to write log', e)
  }
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}
