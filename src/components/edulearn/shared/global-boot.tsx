'use client'

export function GlobalBoot() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center mesh-bg text-white relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-teal-400/20 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="relative flex flex-col items-center gap-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-2xl shadow-blue-900/50">
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
          <span className="inline-block h-2 w-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: '0.2s' }} />
          <span className="inline-block h-2 w-2 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: '0.4s' }} />
          <span className="ml-2">Loading your workspace…</span>
        </div>
      </div>
    </div>
  )
}
