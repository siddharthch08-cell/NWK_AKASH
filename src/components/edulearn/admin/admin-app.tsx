'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, FolderOpen, FileQuestion,
  BarChart3, Trophy, Megaphone, MailOpen, MessageSquare, FileText, History,
  Settings, LogOut, Menu, ChevronRight, Search, Shield, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { View } from '@/stores/app-store'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  view: View
  icon: LucideIcon
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
          <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-white/40 font-semibold">{group}</div>
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
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 text-left group',
                    active
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium shadow-lg shadow-blue-900/40'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon className={cn('w-4 h-4 shrink-0 transition-transform group-hover:scale-110', active && 'drop-shadow')} />
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

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout, setView } = useApp()
  return (
    <div className="border-t border-white/10 p-3 space-y-2">
      <button
        onClick={() => { setView({ name: 'admin/settings' }); onNavigate?.() }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-left"
      >
        <Avatar className="w-9 h-9 border-2 border-white/20">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-teal-400 text-white font-semibold">
            {user?.name?.charAt(0) || 'A'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 text-left">
          <div className="truncate text-sm font-medium text-white">{user?.name}</div>
          <div className="text-white/50 text-[10px] truncate">{user?.email}</div>
        </div>
      </button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { logout(); onNavigate?.() }}
        className="w-full text-white/70 hover:text-white hover:bg-rose-500/20 border border-white/10"
      >
        <LogOut className="w-4 h-4 mr-2" /> Logout
      </Button>
    </div>
  )
}

export function AdminApp() {
  const { view, user, logout, setView } = useApp()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const handleSearch = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
  }, [])
  useEffect(() => { document.addEventListener('keydown', handleSearch); return () => document.removeEventListener('keydown', handleSearch) }, [handleSearch])

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
      <aside
        className="hidden lg:flex w-64 flex-col shrink-0 sticky top-0 h-screen"
        style={{ background: 'linear-gradient(180deg, hsl(222 47% 20%) 0%, hsl(222 47% 16%) 100%)' }}
      >
        <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
          <button onClick={() => setView({ name: 'admin/dashboard' })} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-lg shadow-blue-900/50 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold tracking-tight text-sm text-white">Naya Wallah Kanoon</div>
              <div className="text-[9px] text-white/40 uppercase tracking-wider">Admin Console</div>
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
        <SheetContent side="left" className="w-72 p-0 flex flex-col" style={{ background: 'linear-gradient(180deg, hsl(222 47% 20%) 0%, hsl(222 47% 16%) 100%)' }}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm text-white">Naya Wallah Kanoon</div>
                <div className="text-[9px] text-white/40 uppercase tracking-wider">Admin</div>
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
            <button onClick={() => setView({ name: 'admin/dashboard' })} className="hover:text-slate-900 transition-colors">Admin</button>
            <ChevronRight className="w-3 h-3" />
            <span className="font-semibold text-slate-900 truncate">{currentLabel}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" aria-label="Search" className="hidden sm:inline-flex text-slate-500 hover:text-slate-900" onClick={() => setSearchOpen(true)}>
              <Search className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-colors" aria-label="Account menu">
                  <Avatar className="w-8 h-8 ring-2 ring-blue-100">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-teal-500 text-white font-semibold text-sm">
                      {user?.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <div className="text-xs font-semibold text-slate-900 leading-tight">{user?.name}</div>
                    <div className="text-[10px] text-slate-500 leading-tight flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" /> Administrator
                    </div>
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
                <DropdownMenuItem onClick={() => setView({ name: 'admin/settings' })}>
                  <Settings className="w-4 h-4 mr-2" /> Settings
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
          <AdminContent />
        </main>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-md p-0">
          <div className="flex items-center border-b px-4">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <Input placeholder="Search... (Ctrl+K)" className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0" autoFocus onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchOpen(false)
              if (e.key === 'Enter') {
                const q = (e.target as HTMLInputElement).value.toLowerCase().trim()
                if (q) {
                  const navMap: Record<string, View> = { students: { name: 'admin/students' }, batches: { name: 'admin/batches' }, courses: { name: 'admin/courses' }, tests: { name: 'admin/tests' }, materials: { name: 'admin/materials' }, announcements: { name: 'admin/announcements' }, feedback: { name: 'admin/feedback' }, contact: { name: 'admin/contact' }, reports: { name: 'admin/reports' }, audit: { name: 'admin/audit' }, settings: { name: 'admin/settings' }, analytics: { name: 'admin/analytics' }, leaderboard: { name: 'admin/leaderboard' } }
                  const match = Object.entries(navMap).find(([k]) => k.includes(q))
                  if (match) { setView(match[1]); setSearchOpen(false) }
                }
              }
            }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { AdminContent } from './admin-content'
