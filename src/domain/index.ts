/**
 * Domain services barrel export.
 */

// Error types
export { DomainError, NotFoundError, ConflictError, ValidationError, ForbiddenError, CapacityError } from './errors'

// Types
export type {
  TxClient,
  AuditContext,
  AssignmentResult,
  EnrollmentResult,
  BatchMembership,
  HierarchyPath,
  PublicationCheck,
  LeaderboardEntry,
  VideoProgressData,
  PaginatedResult,
} from './types'

// Services
export * as BatchCourseService from './batch-course'
export * as EnrollmentService from './enrollment'
export * as StudentAccessService from './student-access'
export * as StudentContentAccessPolicy from './student-access'
export * as ContentLifecycleService from './content-lifecycle'
export * as MaterialService from './material'
export * as TestPublicationService from './test-publication'
export * as TestAttemptService from './test-attempt'
export * as LeaderboardService from './leaderboard'
export * as VideoProgressService from './video-progress'
export * as ResultService from './result'
export * as RegistrationService from './registration'
