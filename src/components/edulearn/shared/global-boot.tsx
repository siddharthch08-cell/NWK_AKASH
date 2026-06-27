'use client'

export function GlobalBoot() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-teal-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 10L12 5 2 10l10 5 10-5z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M22 10v6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight">EDULEARN PRO</div>
            <div className="text-xs text-white/70">Advanced Learning Management System</div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-white/80">
          <span className="inline-block h-2 w-2 rounded-full bg-white/80 animate-pulse" />
          Loading your workspace…
        </div>
      </div>
    </div>
  )
}
