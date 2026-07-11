# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-07-11

### Fixed
- ESLint errors: escaped quotes in about-page.tsx (0 errors now)
- take-test.tsx: stale closure bugs in autosave and countdown timers
- take-test.tsx: race condition between manual and auto-submit
- take-test.tsx: answers ref always holds latest state for autosave
- video-player.tsx: heartbeat interval uses stable callback via refs
- video-player.tsx: progress never moves backwards from stale responses
- video-player.tsx: cleanup properly clears intervals on unmount
- auth.ts: replaced Math.random() fallback with crypto.randomUUID()

### Security
- .env is now untracked and gitignored; .env.example has safe placeholders
- Secret scanner now checks .env files, staged files, and working tree
- Artifact inspection rejects database files, uploads, and secrets
- .dockerignore excludes .env, .git, node_modules, database files
- .gitignore enhanced with comprehensive exclusion patterns

### Changed
- Replaced next/font/google with next/font/local (vendored Geist fonts)
- Added .nvmrc pinning Node 22
- Updated .env.example with full documentation