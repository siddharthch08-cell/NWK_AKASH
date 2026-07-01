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
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: branding panel */}
      <div className="hidden lg:flex relative overflow-hidden mesh-bg text-white p-12 flex-col justify-between">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-lg">Naya Wallah Kanoon</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">Welcome back to your<br />learning journey.</h2>
          <p className="text-blue-100 max-w-md">Sign in to access your courses, video lectures, timed assessments, and detailed progress analytics — all in one place.</p>
        </div>
        <div className="relative grid grid-cols-3 gap-4 max-w-md">
          <div><div className="text-3xl font-bold">5K+</div><div className="text-xs text-blue-200">Students</div></div>
          <div><div className="text-3xl font-bold">42</div><div className="text-xs text-blue-200">Courses</div></div>
          <div><div className="text-3xl font-bold">94%</div><div className="text-xs text-blue-200">Pass Rate</div></div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-50 to-blue-50/50">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 lg:hidden">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-teal-600 items-center justify-center shadow-lg mb-3">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
            <p className="text-sm text-slate-600">Sign in to your Naya Wallah Kanoon account</p>
          </div>
          <div className="hidden lg:block mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
            <p className="text-sm text-slate-600 mt-1">Choose your role and enter your credentials</p>
          </div>

          <Card className="shadow-xl border-slate-200/60">
            <CardHeader>
              <Tabs value={role} onValueChange={(v) => setRole(v as 'ADMIN' | 'STUDENT')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="STUDENT" className="flex items-center gap-2 data-[state=active]:bg-blue-700 data-[state=active]:text-white">
                    <GraduationCap className="w-4 h-4" /> Student
                  </TabsTrigger>
                  <TabsTrigger value="ADMIN" className="flex items-center gap-2 data-[state=active]:bg-blue-700 data-[state=active]:text-white">
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
                  <Input id="email" type="email" autoComplete="email" {...register('email')} className="mt-1 focus-ring" placeholder="you@example.com" />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete="current-password" {...register('password')} className="mt-1 focus-ring" placeholder="••••••••" />
                  {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-blue-700 hover:bg-blue-800 btn-glow font-semibold">
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
                <div className="grid grid-cols-1 gap-1">
                  <div>Admin: <code className="text-blue-700">admin@nayawallahkanoon.com</code> / <code className="text-blue-700">Admin@12345</code></div>
                  <div>Student: <code className="text-blue-700">aarav@example.com</code> / <code className="text-blue-700">Student@12345</code></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
