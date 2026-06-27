# Architecture — EDULEARN PRO

## Overview

EDULEARN PRO is a single-page Next.js 16 application with a REST API. The frontend uses a Zustand-based view router (all navigation happens client-side on the `/` route), while the backend exposes 50+ REST endpoints under `/api/`.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                     │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Public Site │  │  Admin App   │  │ Student App   │  │
│  │ (landing,   │  │ (dashboard,  │  │ (dashboard,   │  │
│  │  login,     │  │  students,   │  │  courses,     │  │
│  │  register)  │  │  batches...) │  │  tests...)    │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                │                  │           │
│         └────────────────┼──────────────────┘           │
│                          │                              │
│              ┌───────────▼───────────┐                  │
│              │  Zustand App Store    │                  │
│              │  (auth + view router) │                  │
│              └───────────┬───────────┘                  │
│                          │                              │
│              ┌───────────▼───────────┐                  │
│              │   API Client (fetch)  │                  │
│              │  + 401 auto-redirect  │                  │
│              └───────────┬───────────┘                  │
└──────────────────────────┼──────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────┐
│                  Next.js 16 Server                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              API Routes (/api/*)                  │   │
│  │                                                   │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │   │
│  │  │  Auth   │  │ Public  │  │  Admin + Student │  │   │
│  │  │ /auth/* │  │ /public │  │  /admin /student │  │   │
│  │  └────┬────┘  └────┬────┘  └────────┬────────┘  │   │
│  │       │            │                │            │   │
│  │  ┌────▼────────────▼────────────────▼────────┐   │   │
│  │  │        Middleware Layer                    │   │   │
│  │  │  • requireAdmin / requireActiveStudent     │   │   │
│  │  │  • Zod validation                          │   │   │
│  │  │  • Rate limiting                           │   │   │
│  │  │  • Audit logging                           │   │   │
│  │  └────────────────┬──────────────────────────┘   │   │
│  └───────────────────┼──────────────────────────────┘   │
│                      │                                   │
│  ┌───────────────────▼──────────────────────────────┐   │
│  │           Lib Layer (src/lib/*)                   │   │
│  │  • auth.ts (JWT + bcrypt)                         │   │
│  │  • test-engine.ts (server-side scoring)           │   │
│  │  • storage.ts (file upload security)              │   │
│  │  • validation.ts (Zod schemas)                    │   │
│  │  • constants.ts (enums + config)                  │   │
│  └───────────────────┬──────────────────────────────┘   │
│                      │                                   │
│  ┌───────────────────▼──────────────────────────────┐   │
│  │           Prisma ORM (src/lib/db.ts)              │   │
│  └───────────────────┬──────────────────────────────┘   │
└──────────────────────┼───────────────────────────────────┘
                       │
            ┌──────────▼──────────┐
            │   SQLite / Postgres  │
            │   (30+ models)       │
            └─────────────────────┘
```

## Key Architectural Decisions

### 1. Single-Page App with Zustand View Router
**Decision**: Instead of Next.js file-based routing, we use a single `/` route with a Zustand store that manages a `view` state object. Navigation happens by calling `setView({ name: 'admin/students' })`.

**Rationale**: The sandbox environment only exposes one route (`/`). This pattern keeps all app state in one store, makes auth-gated routing trivial, and avoids full page reloads.

**Trade-off**: No deep-linking or URL history. Acceptable for an internal LMS.

### 2. SQLite for Development, PostgreSQL for Production
**Decision**: The Prisma schema uses `sqlite` provider locally but is written to be PostgreSQL-compatible (no SQLite-specific features).

**Rationale**: SQLite is zero-config for local dev. PostgreSQL is needed for production (concurrent writes, full-text search, JSON columns).

**Migration**: Change `provider = "sqlite"` to `provider = "postgresql"` in `schema.prisma` and update `DATABASE_URL`.

### 3. JWT Access Tokens in localStorage + Refresh Tokens in httpOnly Cookies
**Decision**: Access tokens (15-min TTL) are stored in `localStorage` so the SPA can attach them via `Authorization: Bearer` header. Refresh tokens (7-day TTL) are in httpOnly cookies.

**Rationale**: localStorage is accessible to JS (needed for the SPA to send API requests). httpOnly cookies protect refresh tokens from XSS. The api-client has a global 401 handler that clears stale tokens and redirects to login.

### 4. Server-Side Test Scoring with Transactions
**Decision**: Test scores are calculated exclusively on the server inside a Prisma `$transaction`. The client never sends a score — only selected option IDs.

**Rationale**: Per spec requirement #9: "Do not calculate final test scores on the client." The transaction prevents duplicate scoring and race conditions.

### 5. In-Memory Rate Limiting
**Decision**: A simple sliding-window rate limiter in `src/lib/rate-limit.ts` using a `Map<string, number[]>`.

**Rationale**: No Redis dependency for local dev. For production with multiple instances, replace with Redis-backed limiter.

### 6. Tailwind v4 with `@utility` Directive
**Decision**: Custom CSS utilities (mesh-bg, card-lift, btn-glow, etc.) are defined using Tailwind v4's `@utility` directive instead of plain `.class {}` selectors.

**Rationale**: Tailwind v4 strips plain CSS classes that aren't recognized utilities. The `@utility` directive registers them with Tailwind's engine so they survive the build.

## Data Model

The database has 30+ models organized into 6 domains:

1. **Users & Auth**: User, RefreshToken, UserSession, PasswordResetToken
2. **Batches & Courses**: Batch, BatchEnrollment, Course, BatchCourse, Chapter, Topic, Video, VideoProgress
3. **Materials**: Material
4. **Announcements**: Announcement, AnnouncementBatch
5. **Tests**: Test, TestBatch, Question, QuestionOption, TestAttempt, AttemptAnswer
6. **System**: Feedback, ContactMessage, AuditLog, Notification, InstituteSetting

See `prisma/schema.prisma` for the full schema with relations, constraints, and indexes.

## Security Architecture

### Authentication Flow
```
1. POST /api/auth/login → verifyPassword → signAccessToken + signRefreshToken
2. Client stores access in localStorage, refresh in httpOnly cookie
3. Every API request: Authorization: Bearer <access-token>
4. getAuthContext() verifies token + re-fetches user from DB (status check)
5. On 401: api-client clears token + reloads → bootstrap → login redirect
```

### Authorization Layers
1. **Route-level**: `requireAdmin()` / `requireActiveStudent()` middleware
2. **Resource-level**: Ownership checks (e.g., `attempt.userId === ctx.user.id`)
3. **Field-level**: `select` clauses exclude sensitive fields (passwordHash)

### Test Engine Security
- Questions sent to students **never** include `isCorrect`
- Attempt start time is **server-authoritative** (never client clock)
- Timer survives page refresh (server stores `expiresAt`)
- Auto-submit on expiry (both client + server enforce)
- Max 2 attempts enforced server-side
- Max 20 questions enforced server-side
- Score computed in `$transaction` (idempotent — duplicate submit returns existing result)

## File Upload Security
1. MIME type whitelist (PDF, images, docs)
2. Magic-byte signature check (PDF `%PDF-`, image hex prefixes)
3. File extension whitelist
4. Size limit (configurable, default 20MB)
5. Filename sanitization (strip non-word chars, prevent path traversal)
6. Storage key validation on read (regex guard)

## Audit Logging
Every state-changing admin action writes to `AuditLog` with:
- Actor ID + role
- Action type (enum from `constants.ts`)
- Entity type + ID
- Before/after JSON diff
- IP, user-agent, request ID
- Timestamp

Logs are append-only — no delete/update endpoints exist.
