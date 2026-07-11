/**
 * JWT Configuration
 * ==================
 * Validates JWT secrets at import time.
 * JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are REQUIRED.
 */

const KNOWN_DEFAULT_SECRETS = new Set([
  'nwk-access-secret-dev-only-change-in-prod',
  'nwk-refresh-secret-dev-only-change-in-prod',
  'secret_for_local_dev_12345',
  'secret_for_local_dev_67890',
  'your-secret-here',
  'change-me',
  'jwt-secret',
])

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function validateJwtSecret(value: string, name: string): void {
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters long`)
  }
  if (KNOWN_DEFAULT_SECRETS.has(value)) {
    throw new Error(`${name} is a known default/placeholder value. Generate a secure random secret.`)
  }
}

const isTest = process.env.NODE_ENV === 'test'

export function getJwtSecrets() {
  const access = isTest && !process.env.JWT_ACCESS_SECRET
    ? 'test-access-secret-minimum-32-characters-long'
    : required('JWT_ACCESS_SECRET')
  const refresh = isTest && !process.env.JWT_REFRESH_SECRET
    ? 'test-refresh-secret-minimum-32-characters-long'
    : required('JWT_REFRESH_SECRET')
  if (!isTest) {
    validateJwtSecret(access, 'JWT_ACCESS_SECRET')
    validateJwtSecret(refresh, 'JWT_REFRESH_SECRET')
  }
  if (access === refresh) throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values')
  return { accessSecret: new TextEncoder().encode(access), refreshSecret: new TextEncoder().encode(refresh) }
}
