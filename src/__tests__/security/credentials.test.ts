import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('No Default Credentials', () => {
  it('README should not contain default passwords', () => {
    const readme = fs.readFileSync(path.join(__dirname, '../../../README.md'), 'utf-8')

    // Should not have the old demo accounts table
    expect(readme).not.toContain('Admin@12345')
    expect(readme).not.toContain('Student@12345')
    expect(readme).not.toContain('| Admin | `admin@nayawallahkanoon.in`')
    expect(readme).not.toContain('| Student (Active) | `aarav@example.com`')
  })

  it('seed script should require SEED_MODE', () => {
    const seed = fs.readFileSync(path.join(__dirname, '../../../scripts/seed.ts'), 'utf-8')

    // Should require SEED_MODE env var
    expect(seed).toContain('SEED_MODE')
    expect(seed).toContain('process.exit(1)')
    // Seed credentials must be supplied out of band and never printed
    expect(seed).toContain('SEED_ADMIN_PASSWORD')
    expect(seed).toContain('SEED_STUDENT_PASSWORD')
    expect(seed).not.toContain('Admin login:')
    expect(seed).not.toContain('Student login (ACTIVE):')
    // Should not contain hardcoded passwords
    expect(seed).not.toContain("'Admin@12345'")
    expect(seed).not.toContain("'Student@12345'")
  })

  it('constants should not contain default admin credentials', () => {
    const constantsPath = path.join(__dirname, '../../lib/constants.ts')
    if (fs.existsSync(constantsPath)) {
      const constants = fs.readFileSync(constantsPath, 'utf-8')
      expect(constants).not.toContain('DEFAULT_ADMIN')
      expect(constants).not.toContain('Admin@12345')
    }
    expect(fs.existsSync(constantsPath)).toBe(false)
  })

  it('config should not contain admin password default', () => {
    const config = fs.readFileSync(path.join(__dirname, '../../config/index.ts'), 'utf-8')

    // Should not have initialPassword field
    expect(config).not.toContain('initialPassword')
    expect(config).not.toContain('Admin@12345')
  })

  it('auth.ts should not contain fallback secrets', () => {
    const auth = fs.readFileSync(path.join(__dirname, '../../lib/auth.ts'), 'utf-8')

    // Should import from config
    expect(auth).toContain("import { getJwtSecrets } from '@/config'")
    expect(auth).toContain('getJwtSecrets().accessSecret')
    // Should NOT contain hardcoded fallback secrets
    expect(auth).not.toContain('nwk-access-secret-dev-only-change-in-prod')
    expect(auth).not.toContain('nwk-refresh-secret-dev-only-change-in-prod')
  })

  it('refresh route should not contain fallback secrets', () => {
    const refresh = fs.readFileSync(
      path.join(__dirname, '../../app/api/auth/refresh/route.ts'),
      'utf-8'
    )

    // Should import from config
    expect(refresh).toContain("import { getJwtSecrets } from '@/config'")
    expect(refresh).toContain('getJwtSecrets().refreshSecret')
    // Should NOT contain hardcoded fallback secrets
    expect(refresh).not.toContain('nwk-refresh-secret-dev-only-change-in-prod')
  })

  it('Caddyfile should not allow arbitrary port proxying', () => {
    const caddyfile = fs.readFileSync(path.join(__dirname, '../../../Caddyfile'), 'utf-8')

    // Should NOT contain the XTransformPort handler
    expect(caddyfile).not.toContain('XTransformPort')
    expect(caddyfile).not.toContain('@transform_port_query')
    // Should have security headers
    expect(caddyfile).toContain('X-Content-Type-Options')
    expect(caddyfile).toContain('X-Frame-Options')
  })
})
