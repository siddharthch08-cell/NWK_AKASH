/**
 * Shared Domain Types
 * ==================================
 * Centralized TypeScript interfaces for all domain entities.
 * Import from here to avoid duplication across API routes and components.
 *
 * Usage:
 *   import type { Student, Batch, Test, Attempt } from '@/types'
 */

// ---------------------------------------------------------------------------
// USERS & AUTH
// ---------------------------------------------------------------------------

export type UserRole = 'ADMIN' | 'STUDENT'

export type StudentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'BLOCKED'
  | 'REJECTED'
  | 'SUSPENDED'

export interface SessionUser {
  id: string
  email: string
  role: UserRole
  name: string
  status: string
  mustChangePassword: boolean
}

export interface CurrentUser {
  id: string
  email: string
  name: string
  role: UserRole
  status: string
  mustChangePassword: boolean
  phone?: string | null
  photo?: string | null
  rejectionReason?: string | null
  lastLoginAt?: string | null
  createdAt?: string
}

export interface Student {
  id: string
  name: string
  email: string
  phone?: string | null
  photo?: string | null
  status: StudentStatus
  createdAt: string
  lastLoginAt?: string | null
  rejectionReason?: string | null
  enrolledBatches: number
  testAttempts: number
}

export interface StudentDetail extends Omit<Student, 'testAttempts' | 'enrolledBatches'> {
  preferredBatchId?: string | null
  updatedAt: string
  enrollments: EnrollmentWithBatch[]
  testAttempts: AttemptWithTest[]
  videoProgress: VideoProgressWithVideo[]
  _count: {
    testAttempts: number
    videoProgress: number
    enrollments: number
  }
}

// ---------------------------------------------------------------------------
// BATCHES & COURSES
// ---------------------------------------------------------------------------

export type BatchStatus =
  | 'DRAFT'
  | 'UPCOMING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'INACTIVE'

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type VideoStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'ARCHIVED'

export interface Batch {
  id: string
  name: string
  slug: string
  description?: string | null
  thumbnail?: string | null
  startDate?: string | null
  endDate?: string | null
  status: BatchStatus
  capacity?: number | null
  enrolledCount: number
  courseCount: number
  testCount: number
  createdAt: string
}

export interface BatchDetail extends Batch {
  creator: { name: string; email: string }
  courses: { course: CourseSummary }[]
  tests: { test: TestSummary }[]
  enrollments: { user: Student; enrolledAt: string }[]
  _count: {
    enrollments: number
    courses: number
    tests: number
    materials: number
    announcements: number
  }
}

export interface EnrollmentWithBatch {
  batch: {
    id: string
    name: string
    slug: string
    status: BatchStatus
  }
  enrolledAt: string
}

export interface Course {
  id: string
  title: string
  slug: string
  description?: string | null
  thumbnail?: string | null
  category?: string | null
  status: CourseStatus
  chapterCount: number
  batchCount: number
  createdAt: string
}

export interface CourseSummary {
  id: string
  title: string
  slug: string
  status: CourseStatus
  thumbnail?: string | null
}

export interface CourseDetail extends Course {
  creator: { name: string; email: string }
  chapters: Chapter[]
  batches: { batch: BatchSummary }[]
}

export interface BatchSummary {
  id: string
  name: string
  slug: string
  status: BatchStatus
}

export interface Chapter {
  id: string
  title: string
  order: number
  topics: Topic[]
}

export interface Topic {
  id: string
  title: string
  order: number
  videos: Video[]
}

export interface Video {
  id: string
  title: string
  description?: string | null
  youtubeId: string
  thumbnail?: string | null
  duration?: number | null
  order: number
  status: VideoStatus
  progress?: VideoProgress | null
}

// ---------------------------------------------------------------------------
// VIDEO PROGRESS
// ---------------------------------------------------------------------------

export interface VideoProgress {
  id: string
  position: number
  percent: number
  completed: boolean
  completedAt?: string | null
  lastWatchedAt: string
}

export interface VideoProgressWithVideo {
  id: string
  percent: number
  completed: boolean
  lastWatchedAt: string
  video: { id: string; title: string }
}

// ---------------------------------------------------------------------------
// TESTS & ATTEMPTS
// ---------------------------------------------------------------------------

export type TestStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'ABANDONED'
export type SubmissionType = 'MANUAL' | 'AUTO_TIMEOUT' | 'ADMIN_FINALIZED'

export interface Test {
  id: string
  title: string
  description?: string | null
  durationMins: number
  maxAttempts: number
  maxQuestions: number
  startAt?: string | null
  endAt?: string | null
  status: TestStatus
  passingPct?: number | null
  questionCount: number
  attemptCount: number
  batchCount: number
  createdAt: string
}

export interface TestSummary {
  id: string
  title: string
  status: TestStatus
  durationMins: number
}

export interface TestDetail extends Test {
  instructions?: string | null
  showAnswerKey: boolean
  showResultImmediately: boolean
  publishedAt?: string | null
  questions: Question[]
  batches: { batch: BatchSummary }[]
  _count: { attempts: number }
}

export interface Question {
  id: string
  text: string
  explanation?: string | null
  marks: number
  order: number
  options: QuestionOption[]
}

export interface QuestionOption {
  id: string
  text: string
  isCorrect: boolean
  order: number
}

/** Question shape sent to students (no isCorrect before submission) */
export interface StudentQuestion {
  id: string
  text: string
  marks: number
  order: number
  options: StudentQuestionOption[]
}

export interface StudentQuestionOption {
  id: string
  text: string
  order: number
}

export interface TestAttempt {
  id: string
  testId: string
  userId: string
  attemptNumber: number
  startedAt: string
  expiresAt: string
  submittedAt?: string | null
  score: number
  totalMarks: number
  percentage: number
  timeTakenSecs: number
  submissionType?: SubmissionType | null
  status: AttemptStatus
}

export interface AttemptWithTest extends TestAttempt {
  test: { id: string; title: string }
}

export interface AttemptAnswer {
  id: string
  attemptId: string
  questionId: string
  selectedOptionId?: string | null
  isCorrect: boolean
  marksAwarded: number
}

// ---------------------------------------------------------------------------
// MATERIALS
// ---------------------------------------------------------------------------

export type MaterialPlatform = 'TELEGRAM' | 'WHATSAPP' | 'GOOGLE_DRIVE' | 'OTHER'
export type MaterialType = 'NOTES' | 'PDF' | 'QUESTION_PAPER' | 'REFERENCE' | 'OTHER'

export interface Material {
  id: string
  title: string
  description?: string | null
  platform: MaterialPlatform
  externalUrl: string
  materialType: MaterialType
  courseId: string
  chapterId: string
  topicId?: string | null
  published: boolean
  archived: boolean
  sortOrder: number
  createdAt: string
  course?: { id: string; title: string } | null
  chapter?: { id: string; title: string } | null
  topic?: { id: string; title: string } | null
}

// ---------------------------------------------------------------------------
// ANNOUNCEMENTS
// ---------------------------------------------------------------------------

export type AnnouncementAudience = 'PUBLIC' | 'ALL_STUDENTS' | 'BATCH'
export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface Announcement {
  id: string
  title: string
  message: string
  audience: AnnouncementAudience
  priority: AnnouncementPriority
  pinned: boolean
  status: AnnouncementStatus
  publishAt: string
  expireAt?: string | null
  creator: { name: string }
  batches?: { batch: { id: string; name: string } }[]
}

// ---------------------------------------------------------------------------
// FEEDBACK & CONTACT
// ---------------------------------------------------------------------------

export type FeedbackCategory =
  | 'COURSE_CONTENT'
  | 'VIDEO_ISSUE'
  | 'TEST_ISSUE'
  | 'TECHNICAL'
  | 'GENERAL'

export type FeedbackStatus = 'NEW' | 'REVIEWING' | 'RESOLVED' | 'CLOSED'

export interface Feedback {
  id: string
  category: FeedbackCategory
  subject: string
  message: string
  rating?: number | null
  status: FeedbackStatus
  notes?: string | null
  createdAt: string
  user: { name: string; email: string }
}

export type ContactStatus = 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED'

export interface ContactMessage {
  id: string
  name: string
  email: string
  phone?: string | null
  subject: string
  message: string
  status: ContactStatus
  notes?: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// AUDIT LOGS
// ---------------------------------------------------------------------------

export interface AuditLog {
  id: string
  actorId?: string | null
  actorRole?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  ip?: string | null
  userAgent?: string | null
  requestId?: string | null
  timestamp: string
  actor?: { name: string; email: string } | null
}

// ---------------------------------------------------------------------------
// SETTINGS
// ---------------------------------------------------------------------------

export interface InstituteSettings {
  id: string
  instituteName: string
  tagline: string
  logo?: string | null
  favicon?: string | null
  primaryEmail?: string | null
  primaryPhone?: string | null
  address?: string | null
  mapsEmbedUrl?: string | null
  heroTitle: string
  heroSubtitle: string
  heroImage?: string | null
  aboutMission?: string | null
  aboutVision?: string | null
  aboutText?: string | null
  statStudents: number
  statCourses: number
  statPassRate: number
  statExperience: number
  socialFacebook?: string | null
  socialTwitter?: string | null
  socialLinkedin?: string | null
  socialYoutube?: string | null
  socialInstagram?: string | null
  videoCompletionThreshold: number
  defaultMaxAttempts: number
  maxUploadMb: number
  maintenanceMode: boolean
  revenueEnabled: boolean
  certificatesEnabled: boolean
}

// ---------------------------------------------------------------------------
// API RESPONSE ENVELOPE
// ---------------------------------------------------------------------------

export interface ApiEnvelope<T = unknown> {
  success: boolean
  data?: T
  message?: string
  meta?: Record<string, unknown>
  error?: {
    code: string
    message: string
    fields?: Record<string, string>
  }
  requestId?: string
}

// ---------------------------------------------------------------------------
// DASHBOARD DATA
// ---------------------------------------------------------------------------

export interface AdminDashboardData {
  cards: {
    totalStudents: number
    pendingStudents: number
    approvedStudents: number
    activeStudents: number
    inactiveStudents: number
    blockedStudents: number
    rejectedStudents: number
    totalBatches: number
    activeBatches: number
    totalCourses: number
    totalVideos: number
    totalTests: number
    testsAttempted: number
    averageScore: number
    totalWatchTimeSecs: number
  }
  studentGrowth: { label: string; registered: number; approved: number }[]
  batchEnrollment: { name: string; enrolled: number; status: string }[]
  topVideos: {
    id: string
    title: string
    viewers: number
    avgCompletion: number
    completed: number
  }[]
  recentActivity: AuditLog[]
  recentRegistrations: Student[]
}

export interface StudentDashboardData {
  user: SessionUser
  stats: {
    enrolledBatches: number
    activeTests: number
    upcomingTests: number
    videosCompleted: number
    totalVideos: number
    avgScore: number
    bestScore: number
    attemptsCount: number
  }
  enrollments: {
    id: string
    name: string
    slug: string
    status: string
    thumbnail?: string
    courseCount: number
    testCount: number
    enrolledAt: string
  }[]
  courseProgress: {
    courseId: string
    courseTitle: string
    thumbnail?: string
    batchName: string
    totalVideos: number
    completedVideos: number
    progressPct: number
  }[]
  upcomingTests: TestSummary[]
  recentResults: AttemptWithTest[]
  recentAnnouncements: Announcement[]
  continueWatching: {
    videoId: string
    title: string
    thumbnail?: string
    courseId: string
    courseTitle: string
    percent: number
    position: number
  }[]
}
