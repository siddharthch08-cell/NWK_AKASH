'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

export function useApi<T>(url: string | null, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!url)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!url) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    api.get<T>(url)
      .then((d) => setData(d))
      .catch((e) => {
        if (e instanceof ApiError) setError(e.message)
        else setError('Failed to load data')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, refreshKey, ...deps])

  return { data, loading, error, refetch, setData }
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, icon: Icon, color = 'blue', hint }: { label: string; value: string | number; icon: any; color?: string; hint?: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700',
    teal: 'from-teal-500 to-emerald-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-red-600',
    violet: 'from-violet-500 to-purple-600',
    slate: 'from-slate-500 to-slate-700',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 card-lift hover:border-slate-300">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs text-slate-500 truncate">{label}</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</div>
          {hint && <div className="text-[10px] text-slate-400 mt-0.5">{hint}</div>}
        </div>
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shadow-md shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, message, action }: { icon: any; title: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12 px-4">
      <Icon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
      <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 mb-4 max-w-sm mx-auto">{message}</p>
      {action}
    </div>
  )
}

export function useToastAction() {
  return {
    success: (msg: string) => toast.success(msg),
    error: (e: unknown, fallback = 'Operation failed') => {
      if (e instanceof ApiError) {
        if (e.fields) {
          Object.entries(e.fields).forEach(([k, v]) => toast.error(`${k}: ${v}`))
        } else {
          toast.error(e.message)
        }
      } else {
        toast.error(fallback)
      }
    },
  }
}
