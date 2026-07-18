# Naya Wallah Kanoon

Naya Wallah Kanoon is a Next.js learning-management application for student approval, batch enrolment, course-shared content, video progress, timed tests, results, and administrative reporting.

## Supported runtime

- Node.js 22 LTS
- npm 10 or 11 (`npm@11.12.1` is pinned in `package.json`)
- Prisma 6 with PostgreSQL (Neon-compatible)
- Redis 7.4 for production rate limiting
- Docker 29+ and Compose for the documented container deployment

Bun is not a supported production runtime. Production startup never runs schema synchronization or migrations.

## Setup

```bash
npm ci
copy .env.example .env
npm run db:generate
npm run db:migrate:deploy
npm run dev
```

On Unix, replace `copy` with `cp`. Generate independent secrets rather than placing example values in `.env`:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Use the first two outputs for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. Use the third as `PROXY_SHARED_SECRET` only when `TRUST_PROXY=true`.

## Required configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL runtime URL; use the provider pooled endpoint in deployed environments |
| `JWT_ACCESS_SECRET` | Unique random value of at least 32 characters |
| `JWT_REFRESH_SECRET` | Different random value of at least 32 characters |
| `REDIS_URL` | Required in production; shared rate-limit store |
| `APP_URL` | Canonical external origin |
| `ALLOWED_HOSTS` | Comma-separated accepted hostnames |
| `ALLOWED_ORIGINS` | Comma-separated browser origins accepted by API CORS checks |
| `TRUST_PROXY` | Enable forwarded-client-IP processing only behind the configured proxy |
| `PROXY_SHARED_SECRET` | At least 32 characters; must match the reverse proxy header when proxy trust is enabled |
| `MAX_REQUEST_BODY_BYTES` | Global proxy request-size ceiling; defaults to 25 MiB to permit the 20 MiB upload limit plus multipart overhead |

See `.env.example` and [the deployment runbook](docs/DEPLOYMENT.md) for the complete set.

## Administrative bootstrap and development data

There is no default account or password. Bootstrap an administrator by supplying credentials out of band:

```bash
ADMIN_EMAIL=owner@example.invalid ADMIN_INITIAL_PASSWORD='<strong-generated-value>' npm run db:bootstrap-admin
```

PowerShell users can set the two environment variables before invoking the npm command. The bootstrap command refuses to overwrite an existing account and does not print the password.

For Docker Compose, bootstrap directly against the persistent database volume:

```bash
ADMIN_EMAIL=owner@example.invalid ADMIN_NAME=Owner ADMIN_INITIAL_PASSWORD='<strong-generated-value>' docker compose --profile tools run --rm bootstrap-admin
```

Demo data is development-only and requires `ALLOW_DEMO_SEED=true`, `SEED_MODE`, `SEED_ADMIN_PASSWORD`, and `SEED_STUDENT_PASSWORD`. The seed command aborts in production and never prints either password. Never use demo data for a deployed environment.

## Academic workflow

1. A student registers in `PENDING` state and cannot log in.
2. An administrator approves the account. Approval does not enrol the student.
3. An approved student may then be enrolled in a valid batch, subject to capacity.
4. Courses are assigned to batches. Chapters, topics, videos, and materials belong to the course and are shared with every eligible assigned batch.
5. Student access requires an approved account, active enrolment, valid course assignment, and accessible lifecycle state.
6. Tests validate questions, options, marks, dates, and eligible batches before publication.
7. Attempts persist answer and shuffle state server-side. Results remain hidden until their publication policy allows disclosure.

## Security design

- JWT secrets are mandatory, distinct, and have no fallback.
- Refresh JWTs are stored only as SHA-256 digests, rotate in token families, and family reuse revokes the family.
- Student approval, academic enrolment, resource access, result serialization, test publication, attempts, and answer persistence have centralized domain owners.
- Production rate limits use Redis and combine trusted client IP with account/email identifiers.
- Forwarded IP headers are ignored unless the reverse proxy authenticates itself with the shared secret.
- CSV and XLSX values are neutralized before quoting or serialization; downloads use sanitized filenames and no-store headers.
- CSP, anti-framing, MIME sniffing, referrer, permissions, host, origin, and body-size controls are applied centrally.
- Audit metadata is redacted and includes actor, action, resource, outcome, and correlation ID when available.

## Quality gates

```bash
npm run db:generate
npm exec prisma validate
npm run db:migrate:deploy
npm run db:check
npm run typecheck
npm run lint
npm test
npm run build
npm run artifact:inspect
npm run security:secrets
npm audit --audit-level=high
docker build -t nwk:local .
```

The test command contains unit, API/domain integration, concurrency, and complete admin/student workflow suites. CI repeats these gates and blocks its Docker build when an earlier mandatory gate fails.

## Production deployment

Migration, application startup, and backup are separate operations:

```bash
npm ci
npm run db:generate
npm run build
npm run db:migrate:deploy
npm run db:check
npm start
```

Run a verified backup before `db:migrate:deploy`. The application start command only starts the standalone Next.js server. For Docker Compose, the one-shot `migrate` service must complete successfully before `app` starts.

Detailed backup, restore, migration recovery, reverse-proxy, Docker, and rollback procedures are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Branch protection

Protect the production branch, require pull requests and approvals, dismiss stale approvals, block force pushes and deletion, and require the `deployment-gates / verify` check. Limit workflow and environment-secret modification to reviewed changes.

## Known limitations

- The supported database in this repository is SQLite. It has a single-writer concurrency model; use one application writer or complete a separately tested database-provider migration before horizontal write scaling.
- Video heartbeat validation detects implausible progress but cannot provide DRM or prove the viewer watched the screen.
- The CSP permits inline script/style required by the current Next.js/UI stack. A nonce-based policy is a future hardening item.
- Uploaded private content requires durable private storage and an external backup policy; it must not be included in source or release archives.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Phase 2 domain architecture](docs/PHASE2_ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Deployment and recovery runbook](docs/DEPLOYMENT.md)
