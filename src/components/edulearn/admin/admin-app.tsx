'use client'

import { useState } from 'react'
import { useApp } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, FolderOpen, FileQuestion,
  BarChart3, Trophy, Megaphone, MailOpen, MessageSquare, FileText, History,
  Settings, LogOut, Menu, Bell, Search, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { View } from '@/stores/app-store'

interface NavItem {
  label: string
  view: View
  icon: any
  group?: string
}

const NAV: NavItem[] = [
  { label: 'Dashboard', view: { name: 'admin/dashboard' }, icon: LayoutDashboard, group: 'Overview' },
  { label: 'Students', view: { name: 'admin/students' }, icon: Users, group: 'Manage' },
  { label: 'Batches', view: { name: 'admin/batches' }, icon: GraduationCap, group: 'Manage' },
  { label: 'Courses & Content', view: { name: 'admin/courses' }, icon: BookOpen, group: 'Manage' },
  { label: 'Study Material', view: { name: 'admin/materials' }, icon: FolderOpen, group: 'Manage' },
  { label: 'Tests', view: { name: 'admin/tests' }, icon: FileQuestion, group: 'Manage' },
  { label: 'Test Results', view: { name: 'admin/tests/results' }, icon: FileText, group: 'Manage' },
  { label: 'Analytics', view: { name: 'admin/analytics' }, icon: BarChart3, group: 'Insights' },
  { label: 'Leaderboard', view: { name: 'admin/leaderboard' }, icon: Trophy, group: 'Insights' },
  { label: 'Announcements', view: { name: 'admin/announcements' }, icon: Megaphone, group: 'Communicate' },
  { label: 'Contact Messages', view: { name: 'admin/contact' }, icon: MailOpen, group: 'Communicate' },
  { label: 'Feedback', view: { name: 'admin/feedback' }, icon: MessageSquare, group: 'Communicate' },
  { label: 'Reports', view: { name: 'admin/reports' }, icon: FileText, group: 'System' },
  { label: 'Audit Logs', view: { name: 'admin/audit' }, icon: History, group: 'System' },
  { label: 'Settings', view: { name: 'admin/settings' }, icon: Settings, group: 'System' },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView } = useApp()
  const groups = Array.from(new Set(NAV.map((n) => n.group)))

  return (
    <nav className="flex flex-col gap-4 px-3 py-4 overflow-y-auto scroll-thin h-full">
      {groups.map((group) => (
        <div key={group}>
          <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-white/50 font-semibold">{group}</div>
          <div className="space-y-0.5">
            {NAV.filter((n) => n.group === group).map((item) => {
              const active = view.name === item.view.name
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setView(item.view)
                    onNavigate?.()
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left',
                    active ? 'sidebar-active font-medium' : 'sidebar-text sidebar-hover'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function AdminApp() {
  const { view, user, logout, setView } = useApp()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Breadcrumbs derived from current view
  const breadcrumbMap: Record<string, string> = {
    'admin/dashboard': 'Dashboard',
    'admin/students': 'Students',
    'admin/students/detail': 'Student Profile',
    'admin/batches': 'Batches',
    'admin/batches/detail': 'Batch Detail',
    'admin/courses': 'Courses & Content',
    'admin/courses/detail': 'Course Detail',
    'admin/materials': 'Study Material',
    'admin/tests': 'Tests',
    'admin/tests/detail': 'Test Detail',
    'admin/tests/results': 'Test Results',
    'admin/analytics': 'Analytics',
    'admin/leaderboard': 'Leaderboard',
    'admin/announcements': 'Announcements',
    'admin/contact': 'Contact Messages',
    'admin/feedback': 'Feedback',
    'admin/reports': 'Reports',
    'admin/audit': 'Audit Logs',
    'admin/settings': 'Settings',
  }
  const currentLabel = breadcrumbMap[view.name] || 'Dashboard'

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col sidebar-bg shrink-0" style={{ background: 'hsl(222 47% 22%)' }}>
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <button onClick={() => setView({ name: 'admin/dashboard' })} className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="font-bold tracking-tight text-sm">EDULEARN PRO</div>
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <SidebarContent />
        </div>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2 px-3 py-2 text-white/80 text-xs">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-semibold">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{user?.name}</div>
              <div className="text-white/50 text-[10px]">Administrator</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="w-full mt-1 text-white/70 hover:text-white hover:bg-white/10">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden fixed top-3 left-3 z-50 bg-white shadow-md" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0" style={{ background: 'hsl(222 47% 22%)' }}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="h-16 flex items-center px-6 border-b border-white/10">
            <div className="flex items-center gap-2 text-white">
              <GraduationCap className="w-5 h-5" />
              <span className="font-bold text-sm">EDULEARN PRO</span>
            </div>
          </div>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 lg:px-8 gap-4 sticky top-0 z-30">
          <div className="lg:hidden w-10" />
          <div className="flex items-center gap-2 text-sm text-slate-500 flex-1 min-w-0">
            <button onClick={() => setView({ name: 'admin/dashboard' })} className="hover:text-slate-900">Admin</button>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium text-slate-900 truncate">{currentLabel}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Search">
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </Button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <AdminContent />
        </main>
      </div>
    </div>
  )
}

// Lazy import to keep this file readable — actual page components live in their own files
import { AdminContent } from './admin-content'
