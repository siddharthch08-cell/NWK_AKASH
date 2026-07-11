'use client'

import { useState } from 'react'
import { useApp } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Menu, GraduationCap } from 'lucide-react'
import type { PublicSettings } from './public-site'

export function PublicHeader({ settings }: { settings: PublicSettings | null }) {
  const { setView, view, user } = useApp()
  const [open, setOpen] = useState(false)

  const navItems: { label: string; view: any }[] = [
    { label: 'Home', view: { name: 'public/home' } },
    { label: 'About', view: { name: 'public/about' } },
    { label: 'Courses', view: { name: 'public/courses' } },
    { label: 'Announcements', view: { name: 'public/announcements' } },
    { label: 'Contact', view: { name: 'public/contact' } },
  ]

  const go = (v: any) => {
    setView(v)
    setOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <button onClick={() => go({ name: 'public/home' })} className="flex items-center gap-2 group">
            {settings?.logo ? <img src={settings.logo} alt="" className="w-9 h-9 rounded-xl object-contain" /> : <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-teal-600 flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:scale-105 group-hover:shadow-lg transition-all"><GraduationCap className="w-5 h-5 text-white" /></div>}
            <div className="flex flex-col items-start leading-tight">
              <span className="font-bold text-slate-900 tracking-tight">
                {settings?.instituteName || 'Naya Wallah Kanoon'}
              </span>
              <span className="text-[10px] text-slate-500 hidden sm:block">
                {settings?.tagline || 'Judicial Classes — New Law, New Way'}
              </span>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.label}
                variant={view.name === item.view.name ? 'default' : 'ghost'}
                size="sm"
                onClick={() => go(item.view)}
                className={view.name === item.view.name ? 'bg-blue-700 hover:bg-blue-800' : 'text-slate-700 hover:text-blue-700'}
              >
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Button
                size="sm"
                onClick={() => useApp.setState({ view: user.role === 'ADMIN' ? { name: 'admin/dashboard' } : { name: 'student/dashboard' } })}
                className="bg-blue-700 hover:bg-blue-800"
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => go({ name: 'public/login' })} className="text-slate-700">
                  Login
                </Button>
                <Button size="sm" onClick={() => go({ name: 'public/register' })} className="bg-blue-700 hover:bg-blue-800">
                  Register
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="text-left">Menu</SheetTitle>
              <nav className="mt-6 flex flex-col gap-1">
                {navItems.map((item) => (
                  <Button
                    key={item.label}
                    variant={view.name === item.view.name ? 'default' : 'ghost'}
                    onClick={() => go(item.view)}
                    className="justify-start"
                  >
                    {item.label}
                  </Button>
                ))}
                <div className="mt-4 border-t pt-4">
                  {user ? (
                    <Button
                      className="w-full bg-blue-700 hover:bg-blue-800"
                      onClick={() => useApp.setState({ view: user.role === 'ADMIN' ? { name: 'admin/dashboard' } : { name: 'student/dashboard' } })}
                    >
                      Go to Dashboard
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" onClick={() => go({ name: 'public/login' })}>Login</Button>
                      <Button className="bg-blue-700 hover:bg-blue-800" onClick={() => go({ name: 'public/register' })}>Register</Button>
                    </div>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
