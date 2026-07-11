import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const standalone = resolve(root, '.next', 'standalone')
if (!existsSync(standalone)) throw new Error('Standalone build output is missing')

mkdirSync(resolve(standalone, '.next'), { recursive: true })
cpSync(resolve(root, '.next', 'static'), resolve(standalone, '.next', 'static'), { recursive: true, force: true })
cpSync(resolve(root, 'public'), resolve(standalone, 'public'), { recursive: true, force: true })
for (const prohibited of ['.env', '.env.local', 'server.log']) rmSync(resolve(standalone, prohibited), { force: true, recursive: true })
