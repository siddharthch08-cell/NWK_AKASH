'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { syncCurrentViewToBrowser, useApp, viewFromBrowserState } from '@/stores/app-store'
import { GlobalBoot } from '@/components/edulearn/shared/global-boot'

const PublicSite = dynamic(() => import('@/components/edulearn/public/public-site').then((module) => module.PublicSite), { loading: () => <GlobalBoot /> })
const AdminApp = dynamic(() => import('@/components/edulearn/admin/admin-app').then((module) => module.AdminApp), { loading: () => <GlobalBoot /> })
const StudentApp = dynamic(() => import('@/components/edulearn/student/student-app').then((module) => module.StudentApp), { loading: () => <GlobalBoot /> })
const AuthStatusScreens = dynamic(() => import('@/components/edulearn/public/auth-status').then((module) => module.AuthStatusScreens), { loading: () => <GlobalBoot /> })
const ForcedPasswordChange = dynamic(() => import('@/components/edulearn/public/forced-password-change').then((module) => module.ForcedPasswordChange), { loading: () => <GlobalBoot /> })

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

  useEffect(() => {
    if (loading) return
    if (view.name.startsWith('admin/') && (!user || user.role !== 'ADMIN')) {
      useApp.setState({ view: { name: 'public/login' } })
      return
    }
    if (view.name.startsWith('student/')) {
      if (!user || user.role !== 'STUDENT') {
        useApp.setState({ view: { name: 'public/login' } })
      } else if (user.status !== 'ACTIVE' && user.status !== 'APPROVED') {
        useApp.setState({ view: { name: 'auth/pending' } })
      }
    }
  }, [loading, user, view.name])

  if (loading) return <GlobalBoot />
  if (view.name.startsWith('public/')) return <PublicSite />
  if (view.name.startsWith('auth/')) {
    return view.name === 'auth/change-password' ? <ForcedPasswordChange /> : <AuthStatusScreens />
  }
  if (view.name.startsWith('admin/')) {
    return user?.role === 'ADMIN' ? <AdminApp /> : <GlobalBoot />
  }
  if (view.name.startsWith('student/')) {
    return user?.role === 'STUDENT' && (user.status === 'ACTIVE' || user.status === 'APPROVED')
      ? <StudentApp />
      : <GlobalBoot />
  }
  return <PublicSite />
}