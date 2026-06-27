/**
 * EDULEARN PRO — Application Configuration
 * =========================================
 * Centralized app configuration. Reads from environment variables with
 * sensible defaults for local development.
 *
 * Usage:
 *   import { config } from '@/config'
 *   const dbUrl = config.database.url
 */

function required(name: string, fallback?: string): string {
  const value = process.env[name] || fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const config = {
  app: {
    name: process.env.APP_NAME || 'EDULEARN PRO',
    tagline: process.env.APP_TAGLINE || 'Advanced Learning Management System',
    url: process.env.APP_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || '/api',
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV !== 'production',
  },

  database: {
    url: required('DATABASE_URL', 'file:./db/custom.db'),
  },

  auth: {
    accessSecret: required(
      'JWT_ACCESS_SECRET',
      'edulearn-pro-access-secret-dev-only-change-in-prod'
    ),
    refreshSecret: required(
      'JWT_REFRESH_SECRET',
      'edulearn-pro-refresh-secret-dev-only-change-in-prod'
    ),
    accessTtl: '15m',
    refreshTtlDays: 7,
    bcryptRounds: 12,
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    uploadDir: process.env.UPLOAD_DIR || 'private-uploads',
    maxUploadMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '20', 10),
  },

  redis: {
    url: process.env.REDIS_URL || null, // null = use in-memory caching
  },

  email: {
    host: process.env.SMTP_HOST || null,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || null,
    password: process.env.SMTP_PASSWORD || null,
    fromEmail: process.env.SMTP_FROM_EMAIL || null,
    fromName: process.env.SMTP_FROM_NAME || 'EDULEARN PRO',
  },

  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || null,
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@edulearn.pro',
    initialPassword: process.env.ADMIN_INITIAL_PASSWORD || 'Admin@12345',
    name: process.env.ADMIN_NAME || 'System Administrator',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  features: {
    certificates: process.env.FEATURE_CERTIFICATES === 'true',
    revenue: process.env.FEATURE_REVENUE === 'true',
    liveClasses: process.env.FEATURE_LIVE_CLASSES === 'true',
    aiRecommendations: process.env.FEATURE_AI_RECOMMENDATIONS === 'true',
  },
} as const

export type AppConfig = typeof config
