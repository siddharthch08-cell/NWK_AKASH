import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { contactSchema } from '@/lib/validation'
import { ok, fromZodError, tooMany, fail } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const rl = rateLimit(`contact:${ip}`, 3, 60 * 60 * 1000) // 3/hour
  if (!rl.ok) return tooMany('Too many contact submissions. Please try again later.')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }

  const parsed = contactSchema.safeParse(body)
  if (!parsed.success) return fromZodError(parsed.error)

  const { name, email, phone, subject, message } = parsed.data

  // Strip any CR/LF from name/email/subject to prevent email header injection
  const safe = (s: string) => s.replace(/[\r\n]+/g, ' ').slice(0, 500)

  const rec = await db.contactMessage.create({
    data: {
      name: safe(name),
      email: safe(email),
      phone: phone ? safe(phone) : null,
      subject: safe(subject),
      message: message.slice(0, 5000),
      status: 'NEW',
    },
  })

  return ok({ id: rec.id }, 'Thank you for contacting us. We will get back to you soon.')
}
