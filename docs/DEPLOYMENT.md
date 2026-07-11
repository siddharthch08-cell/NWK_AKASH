# Deployment and Recovery Runbook

This runbook covers the supported Node.js 22, npm, Prisma/SQLite, Redis, and Docker deployment. It intentionally does not use `prisma db push` or `prisma migrate reset`.

## Release inputs

- A reviewed commit with a passing `deployment-gates / verify` workflow
- Node.js 22 and npm 10–11, or Docker and Compose
- Persistent private volumes for the SQLite database and private uploads
- Redis reachable only by the application network
- TLS terminated by the configured reverse proxy
- Independently generated access-JWT, refresh-JWT, and proxy secrets
- A tested database backup and a separate private-upload backup

Do not place credentials in the repository, image, Compose file, command history, or documentation. There is no default administrator. Run `npm run db:bootstrap-admin` with environment-provided values after the database is migrated.

## Preflight

```bash
npm ci
npm run db:generate
npm exec prisma validate
npm run typecheck
npm run lint
npm test
npm run build
npm run artifact:inspect
npm run security:secrets
npm audit --audit-level=high
```

Review `npm audit` moderate findings separately. A critical or high finding blocks deployment. Confirm that the target environment contains every variable documented in `.env.example`; production also requires Redis and non-empty allowlists.

## SQLite backup

Quiesce application writes first. Prefer SQLite's online backup command when the `sqlite3` CLI is available:

```bash
mkdir -p backups
sqlite3 /srv/nwk/data/custom.db ".backup '/srv/nwk/backups/custom-before-release.db'"
sha256sum /srv/nwk/backups/custom-before-release.db
```

If the CLI is unavailable, stop every application writer, copy the database together with any `-wal` and `-shm` files, then restart only after the copy and hash complete. Never copy an actively written WAL database as a lone `.db` file.

Back up the private-upload volume independently. Store backups encrypted outside the application host. Test restoration to an isolated location:

```bash
DATABASE_URL=file:/srv/nwk/restore-test/custom.db npm run db:check
```

## Migration

For a fresh database:

```bash
npm run db:migrate:deploy
npm run db:check
npx prisma migrate status
```

For an existing Phase 2 database created before migration history was introduced, first copy it and test the exact procedure in isolation. After confirming its schema matches the documented Phase 2 schema, record only the migrations already represented by that schema:

```bash
npx prisma migrate resolve --applied 20260701000000_phase1_baseline
npx prisma migrate resolve --applied 20260703183000_phase2_integrity
npm run db:migrate:deploy
npm run db:check
```

Do not run `migrate resolve` on a fresh database or use it to conceal a failed migration. The Phase 3 refresh-token migration intentionally revokes existing refresh sessions because raw legacy tokens cannot be converted to SHA-256 digests with stock SQLite. Users must authenticate again after that release.

Compare before/after counts for `User`, `Batch`, `Course`, `BatchEnrollment`, `BatchCourse`, `TestAttempt`, and `AttemptAnswer`. `npm run db:check` performs integrity, foreign-key, critical-orphan, and row-count reporting. Refresh-token rows are expected to become zero in this migration; academic row counts must not change.

## Non-Docker release

```bash
npm ci
npm run db:generate
npm run build
npm run db:migrate:deploy
npm run db:check
npm start
```

Run migrations as a release job before replacing the running process. `npm start` serves `.next/standalone/server.js` and performs no database mutation. Persist the database and private-upload directories outside the source checkout.

## Docker Compose release

Set required variables in the deployment environment, then run:

```bash
docker compose build
docker compose run --rm migrate
ADMIN_EMAIL=owner@example.invalid ADMIN_NAME=Owner ADMIN_INITIAL_PASSWORD='<strong-generated-value>' docker compose --profile tools run --rm bootstrap-admin
docker compose up -d redis app
docker compose ps
docker compose logs --tail=100 app
```

The Compose `migrate` service runs `prisma migrate deploy` once. The application container starts only the server. The `dbdata`, `uploads`, and `redisdata` volumes are persistent and must be included in operational backup policy.

Before changing an existing volume, create a database backup from a temporary container with the application stopped or writes quiesced. Do not delete volumes during routine deploy or rollback.

## Reverse proxy and trusted client IP

Terminate HTTPS at the proxy. Set the same random `PROXY_SHARED_SECRET` in the proxy and application, set `TRUST_PROXY=true`, and have the proxy replace—not append—the `X-Proxy-Secret` header. Strip any client-supplied copy. The included Caddy configuration sends this header and routes only to the fixed application upstream.

Configure:

- `APP_URL` to the public HTTPS origin
- `ALLOWED_HOSTS` to exact public hostnames
- `ALLOWED_ORIGINS` to exact browser origins
- `MAX_REQUEST_BODY_BYTES` to an explicit operational limit

Do not expose the application port publicly when proxy trust is enabled. Forwarded IP headers without the authenticated proxy header are treated as untrusted and cannot select arbitrary rate-limit identities.

## Post-deploy validation

1. Confirm `/api` responds through HTTPS with CSP, `nosniff`, frame denial, referrer policy, permissions policy, HSTS, and an `X-Request-ID`.
2. Register a student and confirm the account remains pending and login is denied.
3. Approve through an administrator, then enrol separately and confirm an audit record exists.
4. Confirm the student sees only assigned batch/course content.
5. Save and resume a test answer, submit, and confirm hidden results remain hidden until publication.
6. Attempt access to another student's attempt and confirm denial.
7. Export a formula-prefixed value and confirm it is text in CSV/XLSX.
8. Confirm Redis counters are shared across two application replicas.
9. Run `npm run db:check` against the deployed database.
10. Inspect application logs by correlation ID without exposing request bodies or credentials.

## Failure handling and rollback

If migration fails:

1. Do not start the new application and do not run reset, push, or ad-hoc repair SQL.
2. Capture the migration error, application version, database hash, and `_prisma_migrations` state.
3. Preserve the failed database as evidence.
4. Restore the pre-release database and matching private-upload snapshot to a new location or volume.
5. Point the previous application release to the restored data and run `npm run db:check` before accepting traffic.
6. Diagnose and test a corrected forward migration on another copy.

Application rollback without database rollback is allowed only when the previous version is proven compatible with the migrated schema. For this release, use database restore for full rollback because refresh-token storage changed. There is no automatic down migration.

## Restore

Stop all writers, restore the database and upload snapshot from the same recovery point, verify ownership/permissions, then run:

```bash
npm run db:check
npx prisma migrate status
```

Start one application instance, complete the post-deploy validation, and only then restore normal replica count and traffic.

## Operational limitations

- SQLite supports one writer at a time. Horizontal application replicas require a single shared filesystem with correct locking, which many network filesystems do not provide. Prefer one writer until a separately tested provider migration is complete.
- Redis is mandatory for production rate limiting; the in-memory adapter exists only for development and tests.
- Video progress is plausibility-checked browser telemetry, not DRM or proof of attention.
- The current CSP permits inline script/style for framework compatibility. Test every CSP change against login, admin, student, media, and downloads.
