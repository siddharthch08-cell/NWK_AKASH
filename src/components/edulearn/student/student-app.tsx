'use client'

import { useState } from 'react'
import { useApp } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import {
  LayoutDashboard, GraduationCap, BookOpen, Video, FolderOpen, FileQuestion,
  Trophy, Megaphone, MessageSquare, User, LogOut, Menu, Bell, ChevronRight, Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { View } from '@/stores/app-store'

interface NavItem { label: string; view: View; icon: any }
const NAV: NavItem[] = [
  { label: 'Dashboard', view: { name: 'student/dashboard' }, icon: LayoutDashboard },
  { label: 'My Batches', view: { name: 'student/batches' }, icon: GraduationCap },
  { label: 'My Courses', view: { name: 'student/courses' }, icon: BookOpen },
  { label: 'Study Material', view: { name: 'student/materials' }, icon: FolderOpen },
  { label: 'Tests', view: { name: 'student/tests' }, icon: FileQuestion },
  { label: 'Results', view: { name: 'student/results' }, icon: Trophy },
  { label: 'Leaderboard', view: { name: 'student/leaderboard' }, icon: Trophy },
  { label: 'Announcements', view: { name: 'student/announcements' }, icon: Megaphone },
  { label: 'Feedback', view: { name: 'student/feedback' }, icon: MessageSquare },
  { label: 'Profile', view: { name: 'student/profile' }, icon: User },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView } = useApp()
  return (
    <nav className="flex flex-col gap-1 px-3 py-4 overflow-y-auto scroll-thin h-full">
      {NAV.map((item) => {
        const active = view.name === item.view.name
        return (
          <button
            key={item.label}
            onClick={() => { setView(item.view); onNavigate?.() }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left',
              active ? 'bg-blue-700 text-white font-medium shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function StudentApp() {
  const { view, user, logout, setView } = useApp()
  const [mobileOpen, setMobileOpen] = useState(false)

  const breadcrumbMap: Record<string, string> = {
    'student/dashboard': 'Dashboard',
    'student/batches': 'My Batches',
    'student/batches/detail': 'Batch Detail',
    'student/courses': 'My Courses',
    'student/courses/detail': 'Course',
    'student/videos': 'Video Lecture',
    'student/materials': 'Study Material',
    'student/tests': 'Tests',
    'student/tests/take': 'Take Test',
    'student/results': 'My Results',
    'student/results/detail': 'Result Detail',
    'student/leaderboard': 'Leaderboard',
    'student/announcements': 'Announcements',
    'student/feedback': 'Feedback',
    'student/profile': 'Profile & Settings',
  }
  const currentLabel = breadcrumbMap[view.name] || 'Dashboard'

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-slate-200 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <button onClick={() => setView({ name: 'student/dashboard' })} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-700 to-teal-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="font-bold tracking-tight text-sm text-slate-900">EDULEARN PRO</div>
          </button>
        </div>
        <div className="flex-1 overflow-hidden"><SidebarContent /></div>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-2 px-3 py-2 text-slate-700 text-xs">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0) || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{user?.name}</div>
              <div className="text-slate-500 text-[10px]">{user?.email}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="w-full mt-1 text-slate-600 hover:text-rose-600">
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
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="h-16 flex items-center px-6 border-b">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-700" />
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
            <button onClick={() => setView({ name: 'student/dashboard' })} className="hover:text-slate-900">Student</button>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium text-slate-900 truncate">{currentLabel}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </Button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.charAt(0) || 'S'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <StudentContent />
        </main>
      </div>
    </div>
  )
}

import { StudentContent } from './student-content'
