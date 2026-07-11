import { z } from 'zod'

export const emailSchema = z.string().email('Invalid email address').max(254).toLowerCase()
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/[0-9]/, 'Include at least one number')
export const phoneSchema = z.string().max(20).optional().or(z.literal(''))
export const nameSchema = z.string().min(2, 'Name is too short').max(120)

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    preferredBatchId: z.string().optional(),
    termsAccepted: z.literal(true),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['ADMIN', 'STUDENT']).optional(),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  subject: z.string().min(2).max(200),
  message: z.string().min(5).max(5000),
  // honeypot — must be empty
  company: z.string().max(0).optional().or(z.literal('')),
})

export const batchSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(140).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  description: z.string().max(2000).optional(),
  thumbnail: z.string().url().optional().or(z.literal('')),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED', 'INACTIVE']).optional(),
  capacity: z.number().int().min(1).max(100000).optional(),
})

export const courseSchema = z.object({
  title: z.string().min(2).max(200),
  slug: z.string().min(2).max(140).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional(),
  thumbnail: z.string().url().optional().or(z.literal('')),
  category: z.string().max(80).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  batchIds: z.array(z.string()).optional(),
})

export const chapterSchema = z.object({
  title: z.string().min(2).max(200),
  order: z.number().int().min(0).optional(),
})

export const topicSchema = z.object({
  title: z.string().min(2).max(200),
  order: z.number().int().min(0).optional(),
})

export const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/

export const videoSchema = z.object({
  topicId: z.string().min(1).optional(),
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  youtubeUrl: z.string().optional(),
  youtubeId: z.string().optional(),
  thumbnail: z.string().url().optional().or(z.literal('')),
  duration: z.number().int().min(0).optional(),
  order: z.number().int().min(0).optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED']).optional(),
  scheduledAt: z.string().optional(),
})

export const testSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  instructions: z.string().max(5000).optional(),
  durationMins: z.number().int().min(1).max(300),
  maxAttempts: z.number().int().min(1).max(5),
  maxQuestions: z.number().int().min(1).max(20),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  passingPct: z.number().int().min(0).max(100).optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  showAnswerKey: z.boolean().optional(),
  showResultImmediately: z.boolean().optional(),
  batchIds: z.array(z.string()).optional(),
})

export const questionSchema = z.object({
  text: z.string().min(2).max(2000),
  explanation: z.string().max(2000).optional(),
  marks: z.number().int().min(1).max(20).default(1),
  order: z.number().int().min(0).optional(),
  options: z
    .array(
      z.object({
        text: z.string().min(1).max(500),
        isCorrect: z.boolean(),
      })
    )
    .min(2, 'At least 2 options required')
    .max(6, 'Maximum 6 options allowed')
    .refine((opts) => opts.filter((o) => o.isCorrect).length === 1, {
      message: 'Exactly one correct option is required',
    }),
})

export const announcementSchema = z.object({
  title: z.string().min(2).max(200),
  message: z.string().min(2).max(5000),
  audience: z.enum(['PUBLIC', 'ALL_STUDENTS', 'BATCH']).default('PUBLIC'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
  pinned: z.boolean().default(false),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
  publishAt: z.string().optional(),
  expireAt: z.string().optional(),
  batchIds: z.array(z.string()).optional(),
})

export const feedbackSchema = z.object({
  category: z.enum(['COURSE_CONTENT', 'VIDEO_ISSUE', 'TEST_ISSUE', 'TECHNICAL', 'GENERAL']).default('GENERAL'),
  subject: z.string().min(2).max(200),
  message: z.string().min(5).max(5000),
  rating: z.number().int().min(1).max(5).optional(),
})

export const settingsSchema = z.object({
  instituteName: z.string().min(1).max(120),
  tagline: z.string().max(200).optional(),
  logo: z.string().url().optional().or(z.literal('')),
  favicon: z.string().url().optional().or(z.literal('')),
  primaryEmail: z.string().email().optional().or(z.literal('')),
  primaryPhone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  mapsEmbedUrl: z.string().max(2000).optional(),
  heroTitle: z.string().max(200).optional(),
  heroSubtitle: z.string().max(500).optional(),
  heroImage: z.string().url().optional().or(z.literal('')),
  aboutMission: z.string().max(2000).optional(),
  aboutVision: z.string().max(2000).optional(),
  aboutText: z.string().max(5000).optional(),
  statStudents: z.number().int().min(0).max(10000000).optional(),
  statCourses: z.number().int().min(0).max(100000).optional(),
  statPassRate: z.number().int().min(0).max(100).optional(),
  statExperience: z.number().int().min(0).max(200).optional(),
  socialFacebook: z.string().url().optional().or(z.literal('')),
  socialTwitter: z.string().url().optional().or(z.literal('')),
  socialLinkedin: z.string().url().optional().or(z.literal('')),
  socialYoutube: z.string().url().optional().or(z.literal('')),
  socialInstagram: z.string().url().optional().or(z.literal('')),
  socialWhatsApp: z.string().optional().or(z.literal('')),
  videoCompletionThreshold: z.number().int().min(1).max(100).optional(),
  defaultMaxAttempts: z.number().int().min(1).max(5).optional(),
  maxUploadMb: z.number().int().min(1).max(200).optional(),
  maintenanceMode: z.boolean().optional(),
  revenueEnabled: z.boolean().optional(),
  certificatesEnabled: z.boolean().optional(),
})

export const profileUpdateSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  photo: z.string().url().optional().or(z.literal('')),
})

export const attemptSubmitSchema = z.object({
  attemptId: z.string().min(1).optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedOptionId: z.string().min(1).nullable(),
        revision: z.number().int().min(0).optional(),
      })
    )
    .default([]),
  submissionType: z.enum(['MANUAL', 'AUTO_TIMEOUT']).default('MANUAL'),
  finalize: z.boolean().optional(),
})

export const progressHeartbeatSchema = z.object({
  videoId: z.string().min(1),
  position: z.number().int().min(0),
  percent: z.number().int().min(0).max(100),
  duration: z.number().int().min(0).optional(),
  sessionId: z.string().min(8).max(100),
})

export interface VideoProgressInput {
  position: number
  percent: number
  duration: number
}

export function validateVideoProgress(input: VideoProgressInput) {
  const result = progressHeartbeatSchema.safeParse({
    videoId: 'test',
    position: input.position,
    percent: input.percent,
    duration: input.duration,
    sessionId: 'test-session-id-placeholder',
  })

  if (!result.success) {
    return { success: false as const, errors: result.error.flatten().fieldErrors }
  }

  if (input.duration > 0 && input.position > input.duration) {
    return { success: false as const, errors: { position: ['Position cannot exceed duration'] } }
  }

  return { success: true as const }
}
