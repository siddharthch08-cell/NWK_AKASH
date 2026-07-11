import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const root = path.resolve(__dirname, '../../..')
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

describe('Phase 3 deployment contracts', () => {
  it('starts through fail-fast preflight and never mutates schema at app startup', () => {
    const pkg = JSON.parse(read('package.json'))
    const dockerfile = read('Dockerfile')
    expect(pkg.scripts.start).toBe('node scripts/start-production.mjs')
    expect(read('scripts/start-production.mjs')).toContain("required('JWT_ACCESS_SECRET', 32)")
    expect(dockerfile).not.toContain('db push')
    expect(dockerfile).not.toContain('migrate deploy')
  })

  it('keeps JWT values runtime-only and stores refresh tokens by digest', () => {
    const auth = read('src/lib/auth.ts')
    const login = read('src/app/api/auth/login/route.ts')
    expect(auth).toContain('getJwtSecrets().accessSecret')
    expect(auth).toContain("createHash('sha256')")
    expect(login).toContain('token: hashRefreshToken(refresh)')
  })

  it('uses shared safe helpers for every CSV and XLSX export route', () => {
    const exportRoutes = [
      'src/app/api/admin/students/export/route.ts',
      'src/app/api/admin/batches/[id]/export/route.ts',
      'src/app/api/admin/reports/students/route.ts',
      'src/app/api/admin/reports/batches/route.ts',
      'src/app/api/admin/reports/attempts/route.ts',
      'src/app/api/admin/reports/leaderboard/route.ts',
    ]
    for (const route of exportRoutes) {
      const source = read(route)
      expect(source).toMatch(/createCsv|createXlsxDownload/)
      expect(source).toContain("enforceRateLimit(req, 'export'")
    }
  })

  it('defines the mandatory security headers in next.config.ts', () => {
    const config = read('next.config.ts')
    for (const header of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) expect(config).toContain(header)
  })

  it('commits migration history and uses migrate deploy in the release job', () => {
    expect(read('prisma/migrations/migration_lock.toml')).toContain('provider = "sqlite"')
    expect(read('docker-compose.yml')).toContain('prisma", "migrate", "deploy')
    expect(read('.github/workflows/ci.yml')).toContain('Fresh migration deploy')
  })
})
