'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react'
import type { PublicSettings } from './public-site'

const schema = z.object({
  name: z.string().min(2, 'Name is too short').max(120),
  email: z.string().email('Invalid email'),
  phone: z.string().max(20).optional().or(z.literal('')),
  subject: z.string().min(2).max(200),
  message: z.string().min(5).max(5000),
  company: z.string().max(0).optional().or(z.literal('')), // honeypot
})

type FormData = z.infer<typeof schema>

export function ContactPage({ settings }: { settings: PublicSettings | null }) {
  const { setView } = useApp()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      await api.post('/api/public/contact', data)
      toast.success('Thank you! Your message has been sent. We will get back to you soon.')
      reset()
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.fields) {
          Object.entries(e.fields).forEach(([k, v]) => toast.error(`${k}: ${v}`))
        } else {
          toast.error(e.message)
        }
      } else {
        toast.error('Failed to submit. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-gradient-to-br from-blue-900 to-teal-800 text-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold">Contact Us</h1>
          <p className="mt-2 text-blue-100">Have a question? We would love to hear from you.</p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Honeypot — hidden from users */}
                  <input type="text" tabIndex={-1} autoComplete="off" {...register('company')} className="hidden" aria-hidden="true" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input id="name" {...register('name')} className="mt-1" />
                      {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" {...register('email')} className="mt-1" />
                      {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" {...register('phone')} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject *</Label>
                      <Input id="subject" {...register('subject')} className="mt-1" />
                      {errors.subject && <p className="text-xs text-red-600 mt-1">{errors.subject.message}</p>}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea id="message" rows={5} {...register('message')} className="mt-1" />
                    {errors.message && <p className="text-xs text-red-600 mt-1">{errors.message.message}</p>}
                  </div>
                  <Button type="submit" disabled={submitting} className="bg-blue-700 hover:bg-blue-800">
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    {submitting ? 'Sending…' : 'Send Message'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-700 mt-0.5" />
                  <div>
                    <div className="font-medium text-slate-900">Email</div>
                    <div className="text-sm text-slate-600">{settings?.primaryEmail || 'nayawallahkanoon@gmail.com'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-700 mt-0.5" />
                  <div>
                    <div className="font-medium text-slate-900">Phone</div>
                    <div className="text-sm text-slate-600">{settings?.primaryPhone || '+91 9660315644'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-700 mt-0.5" />
                  <div>
                    <div className="font-medium text-slate-900">Address</div>
                    <div className="text-sm text-slate-600">{settings?.address || 'Jaipur, Rajasthan, India'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {settings?.mapsEmbedUrl && (
              <Card className="overflow-hidden">
                <iframe
                  src={settings.mapsEmbedUrl}
                  className="w-full h-64 border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Map"
                />
              </Card>
            )}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-blue-900 mb-1">Already a student?</h3>
                <p className="text-sm text-blue-800 mb-3">Log in to access your dashboard, courses, and tests.</p>
                <Button variant="outline" onClick={() => setView({ name: 'public/login' })}>Login</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
