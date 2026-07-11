import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Node does not load .env automatically. Preserve explicitly exported values,
// while supporting the documented local/VPS deployment flow.
if (existsSync(resolve('.env')) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(resolve('.env'))
}

process.env.NODE_ENV = 'production'

function required(name, minimumLength = 1) {
  const value = process.env[name]?.trim()
  if (!value || value.length < minimumLength) throw new Error(`${name} is required and must be at least ${minimumLength} characters`)
  return value
}

const accessSecret = required('JWT_ACCESS_SECRET', 32)
const refreshSecret = required('JWT_REFRESH_SECRET', 32)
if (accessSecret === refreshSecret) throw new Error('JWT access and refresh secrets must differ')
required('DATABASE_URL')
required('APP_URL')
required('ALLOWED_HOSTS')
required('ALLOWED_ORIGINS')
if (process.env.TRUST_PROXY === 'true') required('PROXY_SHARED_SECRET', 32)
if (process.env.MAX_REQUEST_BODY_BYTES && (!Number.isFinite(Number(process.env.MAX_REQUEST_BODY_BYTES)) || Number(process.env.MAX_REQUEST_BODY_BYTES) < 1024)) {
  throw new Error('MAX_REQUEST_BODY_BYTES must be a number of at least 1024')
}

const candidates = [resolve('.next/standalone/server.js'), resolve('server.js')]
const server = candidates.find(existsSync)
if (!server) throw new Error('Standalone Next.js server artifact is missing; run npm run build')
await import(pathToFileURL(server).href)
