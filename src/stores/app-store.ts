'use client'

import { create } from 'zustand'
import { api, setToken, ApiError } from '@/lib/api-client'
import type { CurrentUser } from '@/types'

export type View =
  // public
  | { name: 'public/home' }
  | { name: 'public/about' }
  | { name: 'public/courses' }
  | { name: 'public/announcements' }
  | { name: 'public/contact' }
  | { name: 'public/login' }
  | { name: 'public/register' }
  // auth status
  | { name: 'auth/pending' }
  | { name: 'auth/rejected' }
  | { name: 'auth/blocked' }
  | { name: 'auth/inactive' }
  | { name: 'auth/change-password' }
  // admin
  | { name: 'admin/dashboard' }
  | { name: 'admin/students' }
  | { name: 'admin/students/detail'; id: string }
  | { name: 'admin/batches' }
  | { name: 'admin/batches/detail'; id: string }
  | { name: 'admin/courses' }
  | { name: 'admin/courses/detail'; id: string }
  | { name: 'admin/materials' }
  | { name: 'admin/tests' }
  | { name: 'admin/tests/detail'; id: string }
  | { name: 'admin/tests/results' }
  | { name: 'admin/analytics' }
  | { name: 'admin/leaderboard' }
  | { name: 'admin/announcements' }
  | { name: 'admin/contact' }
  | { name: 'admin/feedback' }
  | { name: 'admin/reports' }
  | { name: 'admin/audit' }
  | { name: 'admin/settings' }
  // student
  | { name: 'student/dashboard' }
  | { name: 'student/batches' }
  | { name: 'student/batches/detail'; id: string }
  | { name: 'student/courses' }
  | { name: 'student/courses/detail'; id: string }
  | { name: 'student/videos'; id: string }
  | { name: 'student/materials' }
  | { name: 'student/tests' }
  | { name: 'student/tests/take'; id: string }
  | { name: 'student/results' }
  | { name: 'student/results/detail'; id: string }
  | { name: 'student/leaderboard' }
  | { name: 'student/announcements' }
  | { name: 'student/feedback' }
  | { name: 'student/profile' }

interface AppState {
  user: CurrentUser | null
  loading: boolean
  view: View
  history: View[]
  setView: (v: View) => void
  goBack: () => void
  setUser: (u: CurrentUser | null) => void
  logout: () => Promise<void>
  bootstrap: () => Promise<void>
}

const initialView: View = { name: 'public/home' }

const BROWSER_VIEW_STATE = 'edulearnView'

function pushBrowserView(view: View) {
  if (typeof window === 'undefined') return
  window.history.pushState({ ...window.history.state, [BROWSER_VIEW_STATE]: view }, '')
}

function replaceBrowserView(view: View) {
  if (typeof window === 'undefined') return
  window.history.replaceState({ ...window.history.state, [BROWSER_VIEW_STATE]: view }, '')
}

export function viewFromBrowserState(state: unknown): View | null {
  if (!state || typeof state !== 'object') return null
  const candidate = (state as Record<string, unknown>)[BROWSER_VIEW_STATE]
  if (!candidate || typeof candidate !== 'object' || typeof (candidate as { name?: unknown }).name !== 'string') return null
  return candidate as View
}

export function syncCurrentViewToBrowser(view: View) {
  replaceBrowserView(view)
}

export const useApp = create<AppState>((set, _get) => ({
  user: null,
  loading: true,
  view: initialView,
  history: [],
  setView: (v) =>
    set((s) => {
      if (s.view.name === v.name && ('id' in s.view ? s.view.id : undefined) === ('id' in v ? v.id : undefined)) return s
      pushBrowserView(v)
      return { view: v, history: [...s.history, s.view].slice(-20) }
    }),
  goBack: () =>
    set((s) => {
      if (s.history.length === 0) return s
      const prev = s.history[s.history.length - 1]
      replaceBrowserView(prev)
      return { view: prev, history: s.history.slice(0, -1) }
    }),
  setUser: (u) => set({ user: u }),
  logout: async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      /* ignore */
    }
    setToken(null)
    replaceBrowserView(initialView)
    set({ user: null, view: { name: 'public/home' }, history: [] })
  },
  bootstrap: async () => {
    try {
      const data = await api.get<{ user: CurrentUser }>('/api/auth/me')
      set({ user: data.user, loading: false })
      // Route based on role + status
      const u = data.user
      if (u.role === 'ADMIN') {
        const nextView: View = u.mustChangePassword ? { name: 'auth/change-password' } : { name: 'admin/dashboard' }
        replaceBrowserView(nextView)
        set({ view: nextView })
      } else {
        const nextView = viewForStudent(u.status)
        replaceBrowserView(nextView)
        set({ view: nextView })
      }
    } catch {
      setToken(null)
      replaceBrowserView(initialView)
      set({ user: null, loading: false, view: { name: 'public/home' } })
    }
  },
}))

export function viewForStudent(status: string): View {
  switch (status) {
    case 'ACTIVE':
    case 'APPROVED':
      return { name: 'student/dashboard' }
    case 'PENDING':
      return { name: 'auth/pending' }
    case 'REJECTED':
      return { name: 'auth/rejected' }
    case 'BLOCKED':
    case 'SUSPENDED':
      return { name: 'auth/blocked' }
    case 'INACTIVE':
      return { name: 'auth/inactive' }
    default:
      return { name: 'auth/pending' }
  }
}


export { ApiError }
