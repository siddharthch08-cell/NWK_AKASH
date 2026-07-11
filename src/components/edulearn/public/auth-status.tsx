'use client'

import { useApp } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, XCircle, Ban, PauseCircle, LogOut, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

export function AuthStatusScreens() {
  const { view, user, logout, bootstrap, setView } = useApp()
  const [checking, setChecking] = useState(false)

  const refresh = async () => {
    setChecking(true)
    await bootstrap()
    setChecking(false)
    toast.success('Status refreshed')
  }

  const config = {
    'auth/pending': {
      icon: Clock,
      title: 'Account Pending Approval',
      message: 'Your registration has been received. Our admin team will review and approve your account shortly. Please check back later.',
      color: 'amber',
    },
    'auth/rejected': {
      icon: XCircle,
      title: 'Registration Rejected',
      message: user?.rejectionReason
        ? `Unfortunately, your registration was rejected. Reason: ${user.rejectionReason}`
        : 'Unfortunately, your registration was rejected. Please contact support if you believe this is an error.',
      color: 'rose',
    },
    'auth/blocked': {
      icon: Ban,
      title: 'Account Blocked',
      message: 'Your account has been blocked by an administrator. Please contact support for assistance.',
      color: 'rose',
    },
    'auth/inactive': {
      icon: PauseCircle,
      title: 'Account Inactive',
      message: 'Your account is currently inactive. Please contact support to reactivate it.',
      color: 'slate',
    },
  }[view.name as 'auth/pending'] || {
    icon: Clock,
    title: 'Status Pending',
    message: 'Please contact support.',
    color: 'slate',
  }

  const colorMap: Record<string, string> = {
    amber: 'from-amber-50 to-amber-100 text-amber-900 border-amber-200',
    rose: 'from-rose-50 to-rose-100 text-rose-900 border-rose-200',
    slate: 'from-slate-50 to-slate-100 text-slate-900 border-slate-200',
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colorMap[config.color]} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md">
        <Card className={`border-2 ${config.color === 'amber' ? 'border-amber-200' : config.color === 'rose' ? 'border-rose-200' : 'border-slate-200'}`}>
          <CardContent className="pt-8 pb-8 text-center">
            <div className={`inline-flex w-16 h-16 rounded-full items-center justify-center mb-4 ${config.color === 'amber' ? 'bg-amber-100 text-amber-700' : config.color === 'rose' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
              <config.icon className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold mb-2">{config.title}</h1>
            <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto">{config.message}</p>
            {user && (
              <div className="bg-white/60 rounded-lg p-3 mb-4 text-sm">
                <div className="text-slate-500">Signed in as</div>
                <div className="font-semibold">{user.name}</div>
                <div className="text-xs text-slate-500">{user.email}</div>
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={refresh} disabled={checking}>
                <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
              <Button variant="outline" onClick={() => setView({ name: 'public/home' })}>
                Back to Home
              </Button>
              <Button variant="ghost" onClick={logout} className="text-red-600 hover:text-red-700">
                <LogOut className="w-4 h-4 mr-1" /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
