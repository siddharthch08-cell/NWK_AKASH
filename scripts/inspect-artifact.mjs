import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs'
import { basename, extname, resolve, relative } from 'node:path'

function writeLine(message) {
  process.stdout.write(`${message}\n`)
}

const root = resolve(process.argv[2] || '.next/standalone')
if (!existsSync(root)) {
  writeLine(`Artifact directory not found: ${root} — skipping inspection (build first)`)
  process.exit(0)
}

// These are forbidden at the root level of the artifact
const forbiddenRootNames = new Set([
  '.git', '.gitignore', '.env', '.env.local', '.env.production', '.env.staging',
  'server.log', 'worklog.md', 'tool-results', 'upload', 'private-uploads',
  'test-results', '.zscripts', 'skills', 'examples', 'docs',
  'coverage', 'db',
  'docker-compose.yml', 'Dockerfile', '.dockerignore',
  '.eslintrc', '.editorconfig', '.nvmrc',
  'vitest.config.ts', 'tsconfig.json', 'components.json',
  'package-lock.json', 'bun.lock', 'src',
])

const forbiddenExtensions = new Set([
  '.db', '.sqlite', '.sqlite3', '.log', '.pid', '.pem', '.key', '.env',
  '.db-wal', '.db-shm', '.zip', '.tar', '.gz',
  '.tsbuildinfo',
])

// Known safe directories inside standalone output
const standaloneSafeDirs = new Set(['node_modules', '.next'])

const findings = []
let fileCount = 0
const MAX_ARTIFACT_SIZE_BYTES = 100 * 1024 * 1024

function walk(directory, depth = 0) {
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry)
    const rel = relative(root, path)
    const name = basename(path).toLowerCase()
    const ext = extname(path).toLowerCase()

    // Skip known-safe internal directories in standalone output (node_modules, .next)
    if (depth === 0 && standaloneSafeDirs.has(name)) continue

    if (depth === 0 && forbiddenRootNames.has(name)) {
      findings.push(`${rel} (forbidden at artifact root: ${name})`)
    }

    // Check file extensions in public/ and top-level
    if (ext && forbiddenExtensions.has(ext)) {
      findings.push(`${rel} (forbidden extension: ${ext})`)
    }

    try {
      const stat = statSync(path)
      if (stat.isFile()) {
        fileCount++
        if (stat.size > MAX_ARTIFACT_SIZE_BYTES) {
          findings.push(`${rel} (oversized: ${(stat.size / 1024 / 1024).toFixed(1)} MiB)`)
        }
        if (ext === '.js' || ext === '.mjs') {
          try {
            const content = readFileSync(path, 'utf8')
            if (/(?:JWT_ACCESS_SECRET|JWT_REFRESH_SECRET|ADMIN_INITIAL_PASSWORD)\s*[:=]\s*["']?[^\s"']{8,}/.test(content)) {
              findings.push(`${rel} (contains embedded secret)`)
            }
          } catch { /* skip unreadable */ }
        }
      } else if (stat.isDirectory()) {
        walk(path, depth + 1)
      }
    } catch { /* skip inaccessible */ }
  }
}

walk(root)

if (findings.length) {
  console.error(`Artifact inspection failed with ${findings.length} issue(s):\n${findings.join('\n')}`)
  process.exit(1)
}
writeLine(`Artifact inspection passed: ${root} (${fileCount} files)`)
