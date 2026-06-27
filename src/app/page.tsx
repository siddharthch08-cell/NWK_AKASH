'use client'

import { useEffect } from 'react'
import { useApp } from '@/stores/app-store'
import { setToken } from '@/lib/api-client'
import { PublicSite } from '@/components/edulearn/public/public-site'
import { AdminApp } from '@/components/edulearn/admin/admin-app'
import { StudentApp } from '@/components/edulearn/student/student-app'
import { AuthStatusScreens } from '@/components/edulearn/public/auth-status'
import { GlobalBoot } from '@/components/edulearn/shared/global-boot'

export default function Home() {
  const { user, loading, view, bootstrap } = useApp()

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

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
