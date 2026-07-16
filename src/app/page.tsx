'use client'

import { useEffect } from 'react'
import { syncCurrentViewToBrowser, useApp, viewFromBrowserState } from '@/stores/app-store'
import { PublicSite } from '@/components/edulearn/public/public-site'
import { AdminApp } from '@/components/edulearn/admin/admin-app'
import { StudentApp } from '@/components/edulearn/student/student-app'
import { AuthStatusScreens } from '@/components/edulearn/public/auth-status'
import { GlobalBoot } from '@/components/edulearn/shared/global-boot'
import { ForcedPasswordChange } from '@/components/edulearn/public/forced-password-change'

export default function Home() {
  const { user, loading, view, bootstrap } = useApp()

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    if (loading) return
    syncCurrentViewToBrowser(view)
    const onPopState = (event: PopStateEvent) => {
      const previousView = viewFromBrowserState(event.state)
      useApp.setState((state) => ({
        view: previousView || { name: 'public/home' },
        history: state.history.slice(0, -1),
      }))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [loading, view])

  if (loading) {
    return <GlobalBoot />
  }

  // Public views — always rendered inside the public site shell
  if (view.name.startsWith('public/')) {
    return <PublicSite />
  }

  // Auth status screens (pending/rejected/blocked/inactive) — rendered inside
  // a minimal chrome with logout button
  if (view.name.startsWith('auth/')) {
    if (view.name === 'auth/change-password') return <ForcedPasswordChange />
    return <AuthStatusScreens />
  }

  // Admin app
  if (view.name.startsWith('admin/')) {
    if (!user || user.role !== 'ADMIN') {
      // Force-redirect to login
      useApp.setState({ view: { name: 'public/login' } })
      return <PublicSite />
    }
    return <AdminApp />
  }

  // Student app
  if (view.name.startsWith('student/')) {
    if (!user || user.role !== 'STUDENT') {
      useApp.setState({ view: { name: 'public/login' } })
      return <PublicSite />
    }
    if (user.status !== 'ACTIVE' && user.status !== 'APPROVED') {
      useApp.setState({ view: { name: 'auth/pending' } })
      return <AuthStatusScreens />
    }
    return <StudentApp />
  }

  return <PublicSite />
}
