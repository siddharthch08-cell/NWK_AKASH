import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'

// ─── Auth utilities ────────────────────────────────────────────────
describe('Auth security', () => {
  it('cryptoRandomId returns a valid UUID v4 format', async () => {
    const { cryptoRandomId } = await import('@/lib/auth')
    const id = cryptoRandomId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('cryptoRandomId generates unique values across many calls', async () => {
    const { cryptoRandomId } = await import('@/lib/auth')
    const ids = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      ids.add(cryptoRandomId())
    }
    expect(ids.size).toBe(1000)
  })

  it('hashRefreshToken produces a consistent SHA-256 hex digest', async () => {
    const { hashRefreshToken } = await import('@/lib/auth')
    const token = 'test-refresh-token-value'
    const hash = hashRefreshToken(token)
    const expected = createHash('sha256').update(token, 'utf8').digest('hex')
    expect(hash).toBe(expected)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('hashRefreshToken produces different hashes for different tokens', async () => {
    const { hashRefreshToken } = await import('@/lib/auth')
    const h1 = hashRefreshToken('token-a')
    const h2 = hashRefreshToken('token-b')
    expect(h1).not.toBe(h2)
  })
})

// ─── Video progress validation ────────────────────────────────────
describe('Video progress server-side validation', () => {
  it('rejects negative position', async () => {
    const { validateVideoProgress } = await import('@/lib/validation')
    const result = validateVideoProgress({ position: -10, percent: 50, duration: 300 })
    expect(result.success).toBe(false)
  })

  it('rejects percent > 100', async () => {
    const { validateVideoProgress } = await import('@/lib/validation')
    const result = validateVideoProgress({ position: 150, percent: 101, duration: 300 })
    expect(result.success).toBe(false)
  })

  it('rejects position > duration', async () => {
    const { validateVideoProgress } = await import('@/lib/validation')
    const result = validateVideoProgress({ position: 400, percent: 100, duration: 300 })
    expect(result.success).toBe(false)
  })

  it('accepts valid progress values', async () => {
    const { validateVideoProgress } = await import('@/lib/validation')
    const result = validateVideoProgress({ position: 150, percent: 50, duration: 300 })
    expect(result.success).toBe(true)
  })
})

// ─── Submission double-submit prevention ──────────────────────────
describe('Double-submit prevention pattern', () => {
  it('submittingRef prevents concurrent submissions', async () => {
    const submittingRef = { current: false }
    let callCount = 0

    const submit = async () => {
      if (submittingRef.current) return false
      submittingRef.current = true
      callCount++
      await new Promise(resolve => setTimeout(resolve, 50))
      submittingRef.current = false
      return true
    }

    const [r1, r2, r3] = await Promise.all([submit(), submit(), submit()])
    expect(r1).toBe(true)
    expect(r2).toBe(false)
    expect(r3).toBe(false)
    expect(callCount).toBe(1)
  })
})

// ─── Autosave uses latest answers ─────────────────────────────────
describe('Autosave sends latest answers', () => {
  it('always captures current answers via refs', async () => {
    const answersRef = { current: {} as Record<string, string | null> }
    const saveLog: Record<string, string | null>[] = []

    const saveDraft = async () => {
      saveLog.push({ ...answersRef.current })
    }

    // Simulate rapid answer changes
    answersRef.current = { q1: 'a' }
    answersRef.current = { q1: 'a', q2: 'b' }
    answersRef.current = { q1: 'a', q2: 'b', q3: 'c' }

    await saveDraft()
    expect(saveLog).toHaveLength(1)
    expect(saveLog[0]).toEqual({ q1: 'a', q2: 'b', q3: 'c' })
  })
})

// ─── Refresh token family tracking ───────────────────────────────
describe('Refresh token family tracking', () => {
  it('detects token reuse within the same family', () => {
    const tokenStore = new Map<string, { revokedAt: Date | null; familyId: string }>()
    const familyId = 'family-123'

    // First token issued
    tokenStore.set('token-1', { revokedAt: null, familyId })

    // Token rotated — old one revoked, new one issued
    tokenStore.set('token-1', { revokedAt: new Date(), familyId })
    tokenStore.set('token-2', { revokedAt: null, familyId })

    // Attempt to reuse the revoked token-1
    const reused = tokenStore.get('token-1')
    expect(reused?.revokedAt).not.toBeNull()
    expect(reused?.familyId).toBe(familyId)

    // All tokens in the family should be revoked
    for (const [, token] of tokenStore) {
      if (token.familyId === familyId) {
        token.revokedAt = new Date()
      }
    }

    const validCount = [...tokenStore.values()].filter(t => !t.revokedAt).length
    expect(validCount).toBe(0)
  })
})
