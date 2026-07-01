'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api, setToken, ApiError } from '@/lib/api-client'
import { useApp } from '@/stores/app-store'
import type { PublicSettings } from './public-site'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { UserPlus, Loader2, Check, X } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Name is too short').max(120),
  email: z.string().email('Invalid email').toLowerCase(),
  phone: z.string().max(20).optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Needs uppercase')
    .regex(/[a-z]/, 'Needs lowercase')
    .regex(/[0-9]/, 'Needs a number'),
  confirmPassword: z.string(),
  termsAccepted: z.literal(true, { message: 'You must accept the terms' }),
}).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })
type FormData = z.infer<typeof schema>

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ]
  const score = checks.filter((c) => c.ok).length
  const color = score === 0 ? 'bg-slate-200' : score <= 2 ? 'bg-red-500' : score === 3 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="mt-1">
      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${(score / 4) * 100}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-1 mt-2">
        {checks.map((c, i) => (
          <div key={i} className={`text-xs flex items-center gap-1 ${c.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
            {c.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {c.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export function RegisterPage({ settings }: { settings?: PublicSettings | null }) {
  const { setUser, setView } = useApp()
  const [submitting, setSubmitting] = useState(false)
  const [password, setPassword] = useState('')
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      const res = await api.post<{ user: any; accessToken: string }>('/api/auth/register', {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        confirmPassword: data.confirmPassword,
        termsAccepted: true,
      })
      setToken(res.accessToken)
      setUser(res.user)
      toast.success('Registration successful! Your account is pending admin approval.')
      setView({ name: 'auth/pending' })
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.fields) {
          Object.entries(e.fields).forEach(([k, v]) => toast.error(`${k}: ${v}`))
        } else {
          toast.error(e.message)
        }
      } else {
        toast.error('Registration failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Create Student Account</h1>
          <p className="text-sm text-slate-600 mt-1">Fill in your details to register. Accounts require admin approval.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" {...register('name')} className="mt-1" placeholder="Your full name" />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" {...register('email')} className="mt-1" placeholder="you@example.com" />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...register('phone')} className="mt-1" placeholder="+91 98765 43210" />
                  {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password', {
                    onChange: (e) => setPassword(e.target.value),
                  })}
                  className="mt-1"
                  placeholder="••••••••"
                />
                {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
                {password && <PasswordStrength password={password} />}
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input id="confirmPassword" type="password" {...register('confirmPassword')} className="mt-1" placeholder="••••••••" />
                {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>}
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={!!watch('termsAccepted')}
                  onCheckedChange={(v) => setValue('termsAccepted', (v === true) as true, { shouldValidate: true })}
                />
                <Label htmlFor="terms" className="text-sm font-normal text-slate-600">
                  I accept the Terms of Service and Privacy Policy. I understand my account requires admin approval.
                </Label>
              </div>
              {errors.termsAccepted && <p className="text-xs text-red-600">{errors.termsAccepted.message}</p>}
              <Button type="submit" disabled={submitting} className="w-full bg-blue-700 hover:bg-blue-800">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {submitting ? 'Creating account…' : 'Create Account'}
              </Button>
            </form>
            <div className="mt-4 pt-4 border-t text-center text-sm">
              <span className="text-slate-600">Already have an account? </span>
              <button onClick={() => setView({ name: 'public/login' })} className="text-blue-700 font-medium hover:underline">
                Login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
