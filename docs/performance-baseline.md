# Performance baseline

Measured 2026-07-17 from India against `https://nwk-akash.vercel.app/`. The first sample is the first observed request in this run; it is not proof that Neon was fully suspended. No credentials or personal data were collected.

## Environment

- Branch: `codex/submit-reliability-performance`
- Node: 24.15.0
- npm: 11.12.1
- Next.js production build: 16.2.10
- Observed dynamic function region: `iad1` (from `x-vercel-id`)

## Production API timing

Each public endpoint was requested once for the first sample, followed by ten sequential warm samples. Percentiles use nearest-rank selection.

| Endpoint | First observed | Warm p50 | Warm p95 | Status | Response bytes |
|---|---:|---:|---:|---:|---:|
| `/api/public/settings` | 5,769.4 ms | 1,389.0 ms | 1,991.5 ms | 200 | 814 |
| `/api/public/announcements` | 744.2 ms | 510.0 ms | 640.8 ms | 200 | 87 |
| `/api/student/dashboard` | not measured | not measured | not measured | n/a | n/a |
| `/api/admin/dashboard` | not measured | not measured | not measured | n/a | n/a |

Authenticated endpoints were not measured because no disposable benchmark credentials were supplied. The repository's configured database target could not be verified as a dedicated non-production database, so database-backed timing and mutation tests were not run.

## Initial JavaScript

The root route's production chunk set was read from the Next.js build manifests and compressed locally with gzip level 9.

- Raw JavaScript: 1,931,585 bytes
- Gzip JavaScript: 515,090 bytes (503.0 KiB)
- Largest route chunk: 1,203,217 bytes raw / 299,234 bytes gzip
- Target: 200 KiB gzip; hard ceiling: 250 KiB gzip

## Baseline quality gates

After `npm ci`, Prisma was generated explicitly because the existing `postinstall` property is outside `scripts` and therefore did not execute.

| Gate | Baseline result |
|---|---|
| `npm run security:secrets` | passed; 262 files scanned |
| `npm run typecheck` | passed |
| `npm run lint` | passed with 176 pre-existing warnings and 0 errors |
| `npm run test:unit` | passed; 59 tests passed, 20 skipped |
| `npm run build` | passed; 42 routes generated |
| `npm run test:integration` | skipped; database target not verified non-production |
| `npm run test:concurrency` | skipped; database target not verified non-production |

## Baseline notes

- The first unit invocation failed before tests could run because Prisma Client had not been generated. `npm run db:generate` corrected the local generated artifact; the subsequent unit gate passed.
- Production public settings latency exceeded both the warm and cold/idle budgets.
- Production public announcements exceeded the warm p50/p95 budgets during this run.
- Initial JavaScript exceeded the 250 KiB hard ceiling by 253.0 KiB gzip.
## Post-audit verification

Measured from the final local Next.js production build on 2026-07-17. Database-backed latency was not re-measured because the available database target could not be verified as dedicated non-production infrastructure.

### Initial JavaScript after code splitting

The script URLs emitted into the statically rendered root HTML were de-duplicated and compressed locally with gzip optimal compression.

| Metric | Baseline | After | Change |
|---|---:|---:|---:|
| Initial scripts | n/a | 10 | n/a |
| Raw JavaScript | 1,931,585 bytes | 740,824 bytes | -61.6% |
| Gzip JavaScript | 515,090 bytes (503.0 KiB) | 221,081 bytes (215.9 KiB) | -57.1% |
| Largest initial chunk, gzip | 299,234 bytes | 70,980 bytes | -76.3% |

The result is below the 250 KiB hard ceiling. It remains 15.9 KiB above the 200 KiB target, so further framework/shared-dependency trimming is an optional follow-up rather than a release blocker under the plan.

### Bounded work and round trips

| Path | Before | After |
|---|---|---|
| Student course progress | `1 + 2C` database operations | 2 bounded operations |
| Student dashboard course progress | grew by `2C` | one bulk progress operation plus fixed aggregates |
| Admin operational dashboard | loaded broad relation sets in application memory | 4 bounded database operations |
| Admin analytics | mixed into dashboard and loaded all video progress rows | separate endpoint with 5 bounded operations and database-side aggregation |
| Redis IP + identity limiter | up to 2 sequential Redis evaluations | 1 atomic Lua evaluation |
| Draft revision lookup | up to one read per submitted answer | 1 bulk revision read; payload capped at 20 answers |
| Submission scoring writes | one scoring update per answered question | one reset plus updates grouped by mark value; bounded at 21 updates |

Authenticated GET requests are de-duplicated in flight. Dashboard results have a 30-second session-local cache that is invalidated on mutations, authentication changes, logout, and `401` responses. Private/authenticated API responses default to `private, no-store`; only the three public read endpoints use the documented shared-cache policy.

### Final gates

| Gate | Final result |
|---|---|
| `npm run lint` | passed; 0 warnings and 0 errors |
| `npm run typecheck` | passed |
| `npm test` | passed; 65 tests passed, 27 database-gated tests skipped |
| `npm run build` | passed; 43 routes generated |
| `npm audit --omit=dev` | passed; 0 vulnerabilities |
| `npm run security:secrets` | passed; 265 files scanned |
| `npm run security:history` | passed; 47 commits scanned |
| Local production root smoke | HTTP 200; 13,941-byte HTML |
| Public database-backed smoke | unavailable; local database credentials were not valid for a verified non-production database |
| In-app visual smoke | unavailable; no browser backend was exposed in this session |

The generated deployment mode is Vercel rather than Next.js standalone output, so `artifact:inspect` correctly reported that `.next/standalone` was absent and skipped that optional inspection. No deployment, migration, database reset, region change, or production mutation was performed.