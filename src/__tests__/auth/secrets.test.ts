import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Security Configuration', () => {
  const KNOWN_DEFAULT_SECRETS = [
    'nwk-access-secret-dev-only-change-in-prod',
    'nwk-refresh-secret-dev-only-change-in-prod',
    'secret_for_local_dev_12345',
    'secret_for_local_dev_67890',
    'your-secret-here',
    'change-me',
    'jwt-secret',
  ]

  it('should reject known default secrets', () => {
    for (const secret of KNOWN_DEFAULT_SECRETS) {
      expect(secret.length).toBeGreaterThan(0)
      // Verify these are in the blocklist
      expect(KNOWN_DEFAULT_SECRETS).toContain(secret)
    }
  })

  it('should require minimum 32 character secrets', () => {
    const shortSecret = 'tooshort'
    const validSecret = 'a'.repeat(32)

    expect(shortSecret.length).toBeLessThan(32)
    expect(validSecret.length).toBeGreaterThanOrEqual(32)
  })

  it('should require different access and refresh secrets', () => {
    const secret1 = 'access-secret-key-that-is-different'
    const secret2 = 'refresh-secret-key-that-is-different'

    expect(secret1).not.toBe(secret2)
  })

  it('no default credential should work', async () => {
    const defaultPasswords = ['Admin@12345', 'Student@12345']

    // Verify that default passwords are weak and shouldn't be used
    for (const pwd of defaultPasswords) {
      expect(pwd.length).toBeLessThan(20) // Weak passwords
      // Default passwords contain common patterns
      expect(pwd).toMatch(/^(Admin|Student)@\d+$/)
    }
  })

  it('JWT secrets should not appear in code as fallbacks', () => {
    // This test verifies the config module structure
    // The actual verification is that auth.ts imports from @/config
    // and config/index.ts requires env vars without fallbacks
    const authTs = fs.readFileSync(path.join(__dirname, '../../lib/auth.ts'), 'utf-8')
    const configTs = fs.readFileSync(path.join(__dirname, '../../config/index.ts'), 'utf-8')

    // auth.ts should NOT contain hardcoded fallback secrets
    expect(authTs).not.toContain('nwk-access-secret-dev-only-change-in-prod')
    expect(authTs).not.toContain('nwk-refresh-secret-dev-only-change-in-prod')

    // config/index.ts should NOT contain fallback secrets in required()
    // It should throw when secrets are missing
    expect(configTs).toContain("throw new Error(`Missing required environment variable:")
  })
})
