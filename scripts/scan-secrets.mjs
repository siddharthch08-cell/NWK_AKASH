import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

const findings = []

// --- 1. Scan tracked and untracked (non-gitignored) files via git ---
const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
const secretPatterns = [
  { name: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'jwt-secret', pattern: /(?:JWT_ACCESS_SECRET|JWT_REFRESH_SECRET)\s*[:=]\s*(?!["']?(?:\$\{|\$\(|<|$|"))["']?\S{12,}/ },
  { name: 'admin-password', pattern: /ADMIN_INITIAL_PASSWORD\s*[:=]\s*(?!["']?(?:\$\{|\$\(|<|$|"))["']?\S{8,}/ },
  { name: 'aws-access-key', pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/ },
  { name: 'hardcoded-credentials', pattern: /admin@[^\s"']+\s*[/|:]\s*Admin@12345/i },
  { name: 'proxy-secret', pattern: /PROXY_SHARED_SECRET\s*[:=]\s*(?!["']?(?:\$\{|\$\(|<|$|"))["']?\S{8,}/ },
]

// Exclude: test files, lock files, .env.example, and Docker/CI configs (use ${VAR} syntax)
const excludePatterns = /^(src\/__tests__\/|package-lock\.json$|\.env\.example$|docker-compose\.yml$|\.github\/)/

for (const file of tracked) {
  if (excludePatterns.test(file)) continue
  let content
  try { content = readFileSync(file, 'utf8') } catch { continue }
  for (const { name, pattern } of secretPatterns) {
    if (pattern.test(content)) {
      findings.push(`${file}: ${name}`)
    }
  }
}

// --- 2. Check for .env files with actual secret values in the working tree ---
const envFiles = ['.env', '.env.local', '.env.production', '.env.staging', '.env.development']
for (const envName of envFiles) {
  if (existsSync(envName)) {
    let content
    try { content = readFileSync(envName, 'utf8') } catch { continue }
    const hasRealSecrets = /(?:JWT_ACCESS_SECRET|JWT_REFRESH_SECRET|ADMIN_INITIAL_PASSWORD|PROXY_SHARED_SECRET)\s*[:=]\s*["']?(?!\s*["']?)(?!\$\{)[^"'\s]{8,}/i.test(content)
    if (hasRealSecrets) {
      findings.push(`${envName}: contains non-empty secret values (rotate before deployment)`)
    }
  }
}

// --- 3. Scan staged files for secrets ---
try {
  const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
  for (const file of staged) {
    if (excludePatterns.test(file)) continue
    let content
    try { content = readFileSync(file, 'utf8') } catch { continue }
    for (const { name, pattern } of secretPatterns) {
      if (pattern.test(content)) {
        findings.push(`staged:${file}: ${name}`)
      }
    }
  }
} catch { /* git not initialized */ }

if (findings.length) {
  console.error(`Secret scan found ${findings.length} issue(s):\n${findings.join('\n')}`)
  process.exit(1)
}
console.log(`Secret scan passed for ${tracked.length} tracked/untracked files`)
