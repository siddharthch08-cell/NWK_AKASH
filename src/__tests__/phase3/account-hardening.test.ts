import { afterEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, hashRefreshToken, requireAdmin, signAccessToken } from '@/lib/auth'
import { POST as logout } from '@/app/api/auth/logout/route'
import { POST as changePassword } from '@/app/api/auth/change-password/route'

const ids: string[] = []
afterEach(async () => { await db.user.deleteMany({ where: { id: { in: ids.splice(0) } } }) })

async function admin(mustChangePassword: boolean) {
  const id = crypto.randomUUID(); ids.push(id)
  return db.user.create({ data: { id, email: `${id}@test.local`, name: 'Admin', role: 'ADMIN', status: 'ACTIVE', passwordHash: await hashPassword('InitialPass123'), mustChangePassword } })
}

describe('account hardening', () => {
  it('blocks bootstrap administrators from admin APIs until password change', async () => {
    const user = await admin(true)
    const token = await signAccessToken({ id: user.id, email: user.email, name: user.name, role: 'ADMIN', status: 'ACTIVE', mustChangePassword: true })
    const request = new NextRequest('http://localhost/api/admin/settings', { headers: { authorization: `Bearer ${token}` } })
    expect(await requireAdmin(request)).toBeNull()
    await db.user.update({ where: { id: user.id }, data: { mustChangePassword: false } })
    expect((await requireAdmin(request))?.user.id).toBe(user.id)
  })

  it('revokes refresh tokens even when access authentication is absent', async () => {
    const user = await admin(false); const raw = 'expired-access-logout-refresh-token'
    const saved = await db.refreshToken.create({ data: { userId: user.id, token: hashRefreshToken(raw), familyId: crypto.randomUUID(), expiresAt: new Date(Date.now() + 60000) } })
    await logout(new NextRequest('http://localhost/api/auth/logout', { method: 'POST', headers: { cookie: `refresh_token=${raw}` } }))
    expect((await db.refreshToken.findUniqueOrThrow({ where: { id: saved.id } })).revokedAt).not.toBeNull()
  })

  it('clears the bootstrap flag when the initial password is changed', async () => {
    const user = await admin(true)
    const token = await signAccessToken({ id: user.id, email: user.email, name: user.name, role: 'ADMIN', status: 'ACTIVE', mustChangePassword: true })
    const request = new NextRequest('http://localhost/api/auth/change-password', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ currentPassword: 'InitialPass123', newPassword: 'ChangedPass123', confirmPassword: 'ChangedPass123' }) })
    expect((await changePassword(request)).status).toBe(200)
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).mustChangePassword).toBe(false)
  })
})
