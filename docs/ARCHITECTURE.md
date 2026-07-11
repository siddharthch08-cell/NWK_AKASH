# Architecture

## Runtime view

```text
Browser
  |
  | HTTPS
  v
Reverse proxy (fixed upstream, TLS, authenticated proxy header)
  |
  v
Next.js proxy
  |-- host/origin/body-size checks
  |-- request correlation ID
  |-- security headers and CORS
  v
API route wrapper responsibilities
  |-- authenticate and authorize
  |-- validate params/query/body
  |-- enforce Redis-backed endpoint limit
  |-- call one domain owner
  |-- serialize an explicit DTO
  |-- map safe errors and write audit outcome
  v
Domain services
  |-- registration / approval
  |-- course-batch / enrolment
  |-- student-access policy
  |-- content / materials lifecycle
  |-- test publication / attempts / results
  |-- video progress
  v
Prisma transactions --> SQLite persistent volume

Redis shared store <--- all production application replicas
```

The public, administrator, and student interfaces share one Next.js application. Existing route paths remain compatibility entry points; overlapping routes delegate business rules to the same domain service.

## Business ownership

| Rule | Authoritative owner |
| --- | --- |
| Student registration | `src/domain/registration.ts` |
| Administrative approval/status | `src/lib/student-status.ts` plus thin status routes |
| Student-batch enrolment and capacity | `src/domain/enrollment/service.ts` |
| Course-batch assignment and synchronization | `src/domain/course-batch/service.ts` |
| Student academic resource access | `src/domain/student-access/policy.ts` |
| Chapter/topic/video archive lifecycle | `src/domain/content-lifecycle.ts` |
| Material create/update final-state validation | `src/domain/material.ts` |
| Test publication | `src/domain/test-publication.ts` |
| Attempt start, answer upsert, shuffle, finalization | `src/domain/test-attempt.ts` and `src/lib/test-engine.ts` |
| Result visibility and answer-key serialization | `src/domain/result.ts` |
| Video heartbeat and completion | `src/domain/video-progress.ts` |

Routes authenticate, validate transport input, invoke the owner, serialize a safe response, map errors, and audit. They must not reimplement domain policy.

## Academic model

```text
User (approved student)
  `-- BatchEnrollment --> Batch
                         `-- BatchCourse --> Course
                                             |-- Chapter
                                             |    `-- Topic
                                             |         `-- Video
                                             `-- Material
```

Content belongs to a course. A batch assignment determines eligibility; it does not create a second copy or exclusive owner. Account approval and batch enrolment are independent workflows.

Student access is the conjunction of authentication, student role/status, valid enrolment, valid course assignment, and every relevant resource lifecycle state. Archived parents make active-looking children inaccessible.

## Authentication and sessions

Access JWTs are short-lived and signed only with a mandatory environment secret. Refresh JWTs are `httpOnly`, secure in production, include a unique token ID, and are stored only by SHA-256 digest. Rotation consumes the old digest and creates a new member of the same family. Reuse of a consumed/revoked member revokes the family.

Every authenticated request rechecks the account. Pending, rejected, suspended, blocked, or deleted students cannot gain access merely by retaining an older token. Password changes and adverse account transitions revoke refresh sessions.

## Test integrity

- Publication validates questions, option cardinality, correct answers, marks, duration, dates, and eligible batches.
- Attempt start serializes the access/limit check and create operation; retries return the active logical attempt.
- Per-attempt question and option orders are persisted. Scoring uses IDs, not positions.
- `AttemptAnswer` has database uniqueness on `(attemptId, questionId)` and saves use compound-key upsert/revision semantics.
- Manual and timeout finalization use server-persisted answers and are idempotent.
- Result DTOs omit scores until publication and omit answer-key fields unless both publication and test policy permit them.

## Deployment stores

SQLite is the repository's official database provider. Migrations are additive and are applied by `prisma migrate deploy` in a separate release step. The application never runs migration or schema-push commands at startup.

Redis is mandatory in production so limits work across replicas. Development/tests may use the in-memory adapter. Trusted client IP is accepted only from a proxy that supplies the configured shared secret; arbitrary forwarding headers are ignored.

Private uploads, SQLite data, Redis persistence, and backups live outside source and release artifacts.

## API and export boundaries

Responses use explicit selects/DTOs and predictable status codes. Errors include a correlation ID and exclude stack traces. Detailed server logs redact credentials, tokens, cookies, answer keys, and sensitive request bodies.

CSV and XLSX exports share one neutralization rule for formula/control prefixes. CSV quoting follows neutralization. All download filenames and response headers are produced by shared helpers, and sensitive exports are authorized, rate-limited, and audited.

## Security boundary limitations

The current SPA retains its access token client-side, making CSP and XSS prevention important. Refresh tokens remain inaccessible to JavaScript. Browser video telemetry can reject impossible progress but cannot prove attention or provide DRM. SQLite has a single-writer model; do not assume arbitrary horizontal write scaling.
