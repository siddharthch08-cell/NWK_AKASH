'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { useApp } from '@/stores/app-store'

export function ForcedPasswordChange() {
  const { logout } = useApp()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const submit = async () => {
    if (form.newPassword !== form.confirmPassword) return toast.error('Passwords do not match')
    try { await api.post('/api/auth/change-password', form); await logout() }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Password change failed') }
  }
  return <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4"><section className="w-full max-w-md rounded-xl bg-white p-8 shadow space-y-4">
    <h1 className="text-xl font-bold">Change Initial Password</h1><p className="text-sm text-slate-600">Replace the bootstrap password before using administrator features.</p>
    <label className="block text-sm">Current password<input className="mt-1 w-full rounded border p-2" type="password" onChange={e => setForm({ ...form, currentPassword: e.target.value })} /></label>
    <label className="block text-sm">New password<input className="mt-1 w-full rounded border p-2" type="password" onChange={e => setForm({ ...form, newPassword: e.target.value })} /></label>
    <label className="block text-sm">Confirm password<input className="mt-1 w-full rounded border p-2" type="password" onChange={e => setForm({ ...form, confirmPassword: e.target.value })} /></label>
    <button className="w-full rounded bg-blue-700 p-2 text-white" onClick={submit}>Change Password</button><button className="w-full p-2" onClick={logout}>Logout</button>
  </section></main>
}
