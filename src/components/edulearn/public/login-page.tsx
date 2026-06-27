'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api, setToken, ApiError } from '@/lib/api-client'
import { useApp, viewForStudent } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { LogIn, Loader2, GraduationCap, ShieldCheck } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export function LoginPage() {
  const { setUser, setView } = useApp()
  const [role, setRole] = useState<'ADMIN' | 'STUDENT'>('STUDENT')
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      const res = await api.post<{ user: any; accessToken: string }>('/api/auth/login', { ...data, role })
      setToken(res.accessToken)
      setUser(res.user)
      toast.success('Login successful')
      if (res.user.role === 'ADMIN') {
        setView({ name: 'admin/dashboard' })
      } else {
        setView(viewForStudent(res.user.status))
      }
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message)
      } else {
        toast.error('Login failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-teal-600 items-center justify-center shadow-lg mb-3">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-sm text-slate-600">Sign in to your EDULEARN PRO account</p>
        </div>

        <Card>
          <CardHeader>
            <Tabs value={role} onValueChange={(v) => setRole(v as 'ADMIN' | 'STUDENT')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="STUDENT" className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" /> Student
                </TabsTrigger>
                <TabsTrigger value="ADMIN" className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Admin
                </TabsTrigger>
              </TabsList>
              <TabsContent value="STUDENT" className="mt-4">
                <CardTitle className="text-base">Student Login</CardTitle>
                <p className="text-xs text-slate-500 mt-1">Access your courses, tests, and results.</p>
              </TabsContent>
              <TabsContent value="ADMIN" className="mt-4">
                <CardTitle className="text-base">Admin Login</CardTitle>
                <p className="text-xs text-slate-500 mt-1">Manage batches, students, and content.</p>
              </TabsContent>
            </Tabs>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...register('email')} className="mt-1" placeholder="you@example.com" />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" {...register('password')} className="mt-1" placeholder="••••••••" />
                {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-blue-700 hover:bg-blue-800">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                {submitting ? 'Signing in…' : `Sign In as ${role === 'ADMIN' ? 'Admin' : 'Student'}`}
              </Button>
            </form>

            {role === 'STUDENT' && (
              <div className="mt-4 pt-4 border-t text-center text-sm">
                <span className="text-slate-600">Don&apos;t have an account? </span>
                <button onClick={() => setView({ name: 'public/register' })} className="text-blue-700 font-medium hover:underline">
                  Register here
                </button>
              </div>
            )}

            <div className="mt-4 p-3 rounded-lg bg-slate-50 border text-xs text-slate-600">
              <div className="font-semibold mb-1">Demo Accounts</div>
              <div className="grid grid-cols-2 gap-1">
                <div>Admin: <code className="text-blue-700">admin@edulearn.pro</code></div>
                <div>Pass: <code className="text-blue-700">Admin@12345</code></div>
                <div>Student: <code className="text-blue-700">aarav@example.com</code></div>
                <div>Pass: <code className="text-blue-700">Student@12345</code></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
