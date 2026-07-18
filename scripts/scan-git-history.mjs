import { execFileSync, spawnSync } from 'node:child_process'

function writeLine(message) {
  process.stdout.write(`${message}\n`)
}

// Search Git objects directly instead of spawning `git show` for every file
// in every commit. Historical demo passwords are not secrets; current-tree
// scanning separately prevents those credentials from being reintroduced.
const rules = [
  ['private-key', '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'],
  ['cloud-access-key', '(AKIA|ASIA)[A-Z0-9]{16}'],
]

const commits = execFileSync('git', ['rev-list', '--all'], { encoding: 'utf8' })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
const findings = []

for (const commit of commits) {
  for (const [name, pattern] of rules) {
    const result = spawnSync(
      'git',
      ['grep', '-n', '-I', '-E', '-e', pattern, commit, '--', '.', ':!package-lock.json', ':!src/__tests__/**', ':!scripts/scan-*.mjs'],
      { encoding: 'utf8', maxBuffer: 10_000_000 },
    )
    if (result.status !== 0 && result.status !== 1) {
      throw new Error(`git grep failed for ${commit.slice(0, 12)} (${name}): ${result.stderr || `exit ${result.status}`}`)
    }
    if (result.status === 0) {
      for (const line of result.stdout.split(/\r?\n/).filter(Boolean)) {
        findings.push(`${line} (${name})`)
      }
    }
  }
}

if (findings.length) {
  console.error(`Historical secret scan found ${findings.length} location(s):\n${findings.join('\n')}`)
  process.exit(1)
}
writeLine(`Historical secret scan passed across ${commits.length} commit(s)`)
