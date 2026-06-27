'use client'

import { useState } from 'react'
import { useApp } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard, GraduationCap, BookOpen, FolderOpen, FileQuestion,
  Trophy, Megaphone, MessageSquare, User, LogOut, Menu, Bell, ChevronRight, ChevronDown,
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
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 text-left group',
              active
                ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white font-medium shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <item.icon className={cn('w-4 h-4 shrink-0 transition-transform group-hover:scale-110', active && 'drop-shadow')} />
            <span className="truncate">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout, setView } = useApp()
  return (
    <div className="border-t border-slate-200 p-3 space-y-2">
      <button
        onClick={() => { setView({ name: 'student/profile' }); onNavigate?.() }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-100 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white font-semibold text-sm">
          {user?.name?.charAt(0) || 'S'}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="truncate text-sm font-medium text-slate-900">{user?.name}</div>
          <div className="text-slate-500 text-[10px] truncate">{user?.email}</div>
        </div>
      </button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { logout(); onNavigate?.() }}
        className="w-full text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200"
      >
        <LogOut className="w-4 h-4 mr-2" /> Logout
      </Button>
    </div>
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
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 shrink-0">
          <button onClick={() => setView({ name: 'student/dashboard' })} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-teal-600 flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold tracking-tight text-sm text-slate-900">EDULEARN PRO</div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Student Portal</div>
            </div>
          </button>
        </div>
        <div className="flex-1 overflow-hidden"><SidebarContent /></div>
        <SidebarFooter />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden fixed top-3 left-3 z-50 bg-white shadow-md border border-slate-200" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="h-16 flex items-center px-6 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-700 to-teal-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">EDULEARN PRO</div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wider">Student</div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden"><SidebarContent onNavigate={() => setMobileOpen(false)} /></div>
          <SidebarFooter onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-4 sm:px-6 lg:px-8 gap-4 sticky top-0 z-30">
          <div className="lg:hidden w-10" />
          <div className="flex items-center gap-2 text-sm text-slate-500 flex-1 min-w-0">
            <button onClick={() => setView({ name: 'student/dashboard' })} className="hover:text-slate-900 transition-colors">Student</button>
            <ChevronRight className="w-3 h-3" />
            <span className="font-semibold text-slate-900 truncate">{currentLabel}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative text-slate-500 hover:text-slate-900">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-colors" aria-label="Account menu">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-blue-100">
                    {user?.name?.charAt(0) || 'S'}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-xs font-semibold text-slate-900 leading-tight">{user?.name}</div>
                    <div className="text-[10px] text-slate-500 leading-tight flex items-center gap-1"><GraduationCap className="w-2.5 h-2.5" /> Student</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-semibold">{user?.name}</span>
                    <span className="text-xs font-normal text-slate-500">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setView({ name: 'student/profile' })}>
                  <User className="w-4 h-4 mr-2" /> Profile & Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView({ name: 'student/feedback' })}>
                  <MessageSquare className="w-4 h-4 mr-2" /> Give Feedback
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50">
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
