/**
 * EDULEARN PRO — Application Constants
 * ====================================
 * Centralized enums and configuration constants.
 * Single source of truth for status values, limits, and defaults.
 *
 * Usage:
 *   import { STUDENT_STATUS, TEST_LIMITS, AUDIT_ACTIONS } from '@/lib/constants'
 */

// ---------------------------------------------------------------------------
// USER ROLES & STATUSES
// ---------------------------------------------------------------------------

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT',
} as const

export const STUDENT_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
  REJECTED: 'REJECTED',
} as const

/** Valid status transitions for student accounts */
export const STUDENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'REJECTED', 'BLOCKED', 'INACTIVE'],
  APPROVED: ['ACTIVE', 'BLOCKED', 'INACTIVE', 'REJECTED'],
  ACTIVE: ['INACTIVE', 'BLOCKED'],
  INACTIVE: ['ACTIVE', 'BLOCKED', 'APPROVED'],
  BLOCKED: ['ACTIVE'],
  REJECTED: ['APPROVED'],
}

// ---------------------------------------------------------------------------
// CONTENT STATUSES
// ---------------------------------------------------------------------------

export const BATCH_STATUS = {
  DRAFT: 'DRAFT',
  UPCOMING: 'UPCOMING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
  INACTIVE: 'INACTIVE',
} as const

export const COURSE_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const

export const VIDEO_STATUS = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  UNPUBLISHED: 'UNPUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const

// ---------------------------------------------------------------------------
// TEST & ATTEMPT
// ---------------------------------------------------------------------------

export const TEST_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const

export const ATTEMPT_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  ABANDONED: 'ABANDONED',
} as const

export const SUBMISSION_TYPE = {
  MANUAL: 'MANUAL',
  AUTO_TIMEOUT: 'AUTO_TIMEOUT',
  ADMIN_FINALIZED: 'ADMIN_FINALIZED',
} as const

/** Hard limits enforced by the backend (spec: max 20 questions, max 2 attempts) */
export const TEST_LIMITS = {
  MAX_QUESTIONS: 20,
  MIN_QUESTIONS: 1,
  MAX_ATTEMPTS: 5,
  DEFAULT_MAX_ATTEMPTS: 2,
  MAX_OPTIONS_PER_QUESTION: 6,
  MIN_OPTIONS_PER_QUESTION: 2,
  MAX_DURATION_MINS: 300,
  MIN_DURATION_MINS: 1,
} as const

// ---------------------------------------------------------------------------
// MATERIALS
// ---------------------------------------------------------------------------

export const MATERIAL_TYPE = {
  NOTES: 'NOTES',
  ASSIGNMENT: 'ASSIGNMENT',
  TEST_PAPER: 'TEST_PAPER',
  REFERENCE: 'REFERENCE',
} as const

export const MATERIAL_VISIBILITY = {
  BATCH: 'BATCH',
  COURSE: 'COURSE',
  BATCH_AND_COURSE: 'BATCH_AND_COURSE',
} as const

// ---------------------------------------------------------------------------
// ANNOUNCEMENTS
// ---------------------------------------------------------------------------

export const ANNOUNCEMENT_AUDIENCE = {
  PUBLIC: 'PUBLIC',
  ALL_STUDENTS: 'ALL_STUDENTS',
  BATCH: 'BATCH',
} as const

export const ANNOUNCEMENT_PRIORITY = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const

export const ANNOUNCEMENT_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const

// ---------------------------------------------------------------------------
// FEEDBACK & CONTACT
// ---------------------------------------------------------------------------

export const FEEDBACK_CATEGORY = {
  COURSE_CONTENT: 'COURSE_CONTENT',
  VIDEO_ISSUE: 'VIDEO_ISSUE',
  TEST_ISSUE: 'TEST_ISSUE',
  TECHNICAL: 'TECHNICAL',
  GENERAL: 'GENERAL',
} as const

export const FEEDBACK_STATUS = {
  NEW: 'NEW',
  REVIEWING: 'REVIEWING',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const

export const CONTACT_STATUS = {
  NEW: 'NEW',
  READ: 'READ',
  REPLIED: 'REPLIED',
  ARCHIVED: 'ARCHIVED',
} as const

// ---------------------------------------------------------------------------
// AUDIT ACTIONS
// ---------------------------------------------------------------------------

export const AUDIT_ACTIONS = {
  // Auth
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_LOGIN_FAILED: 'ADMIN_LOGIN_FAILED',
  STUDENT_LOGIN: 'STUDENT_LOGIN',
  STUDENT_LOGIN_FAILED: 'STUDENT_LOGIN_FAILED',
  STUDENT_REGISTER: 'STUDENT_REGISTER',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',

  // Student management
  STUDENT_APPROVED: 'STUDENT_APPROVED',
  STUDENT_REJECTED: 'STUDENT_REJECTED',
  STUDENT_BLOCKED: 'STUDENT_BLOCKED',
  STUDENT_UNBLOCKED: 'STUDENT_UNBLOCKED',
  STUDENT_ACTIVATED: 'STUDENT_ACTIVATED',
  STUDENT_DEACTIVATED: 'STUDENT_DEACTIVATED',
  BULK_STUDENT_APPROVED: 'BULK_STUDENT_APPROVED',

  // Batches
  BATCH_CREATED: 'BATCH_CREATED',
  BATCH_UPDATED: 'BATCH_UPDATED',
  BATCH_ARCHIVED: 'BATCH_ARCHIVED',
  ENROLLMENT_ASSIGNED: 'ENROLLMENT_ASSIGNED',
  ENROLLMENT_REMOVED: 'ENROLLMENT_REMOVED',

  // Courses & content
  COURSE_CREATED: 'COURSE_CREATED',
  COURSE_UPDATED: 'COURSE_UPDATED',
  COURSE_ARCHIVED: 'COURSE_ARCHIVED',
  CHAPTER_CREATED: 'CHAPTER_CREATED',
  TOPIC_CREATED: 'TOPIC_CREATED',
  VIDEO_CREATED: 'VIDEO_CREATED',
  VIDEO_PUBLISHED: 'VIDEO_PUBLISHED',

  // Materials
  MATERIAL_UPLOADED: 'MATERIAL_UPLOADED',
  MATERIAL_REMOVED: 'MATERIAL_REMOVED',

  // Tests
  TEST_CREATED: 'TEST_CREATED',
  TEST_PUBLISHED: 'TEST_PUBLISHED',
  TEST_ARCHIVED: 'TEST_ARCHIVED',

  // Communication
  ANNOUNCEMENT_PUBLISHED: 'ANNOUNCEMENT_PUBLISHED',

  // System
  SETTING_UPDATED: 'SETTING_UPDATED',
  REPORT_EXPORTED: 'REPORT_EXPORTED',
  SYSTEM_SEEDED: 'SYSTEM_SEEDED',
} as const

// ---------------------------------------------------------------------------
// AUTH & SECURITY
// ---------------------------------------------------------------------------

export const AUTH_CONFIG = {
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL_DAYS: 7,
  BCRYPT_ROUNDS: 12,
  LOCKOUT_THRESHOLD: 5,
  LOCKOUT_MS: 15 * 60 * 1000, // 15 minutes
} as const

export const RATE_LIMITS = {
  LOGIN: { max: 10, windowMs: 60 * 1000 },          // 10/min
  REGISTER: { max: 5, windowMs: 60 * 60 * 1000 },   // 5/hour
  CONTACT: { max: 3, windowMs: 60 * 60 * 1000 },    // 3/hour
  PASSWORD_CHANGE: { max: 5, windowMs: 60 * 60 * 1000 }, // 5/hour
} as const

// ---------------------------------------------------------------------------
// FILE UPLOAD
// ---------------------------------------------------------------------------

export const UPLOAD_CONFIG = {
  DEFAULT_MAX_MB: 20,
  ALLOWED_MIME: new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]),
  ALLOWED_EXTENSIONS: new Set([
    'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'txt', 'doc', 'docx', 'xls', 'xlsx',
  ]),
  // PDF magic bytes
  PDF_SIGNATURE: Buffer.from('%PDF-'),
  // Image magic byte signatures (hex prefix)
  IMAGE_SIGNATURES: [
    '89504e47', // PNG
    'ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8', // JPEG
    '47494638', // GIF
    '52494646', // WEBP (RIFF)
  ],
} as const

// ---------------------------------------------------------------------------
// YOUTUBE
// ---------------------------------------------------------------------------

export const YOUTUBE_CONFIG = {
  ID_REGEX: /^[a-zA-Z0-9_-]{11}$/,
  NO_COOKIE_DOMAIN: 'youtube-nocookie.com',
  EMBED_PARAMS: 'rel=0&modestbranding=1&enablejsapi=1',
} as const

// ---------------------------------------------------------------------------
// PAGINATION
// ---------------------------------------------------------------------------

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE: 1,
} as const

// ---------------------------------------------------------------------------
// VIDEO PROGRESS
// ---------------------------------------------------------------------------

export const VIDEO_PROGRESS = {
  DEFAULT_COMPLETION_THRESHOLD: 90, // percent
  HEARTBEAT_INTERVAL_MS: 15000,     // 15 seconds
  MIN_POSITION_DELTA: 5,            // seconds — dedup threshold
} as const

// ---------------------------------------------------------------------------
// APP METADATA
// ---------------------------------------------------------------------------

export const APP_META = {
  NAME: 'EDULEARN PRO',
  TAGLINE: 'Advanced Learning Management System',
  VERSION: '1.0.0',
  DEFAULT_ADMIN: {
    EMAIL: 'admin@edulearn.pro',
    DEFAULT_PASSWORD: 'Admin@12345',
  },
} as const
