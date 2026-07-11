import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { hashPassword, type AuthContext } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { ConflictError, ValidationError } from './errors'

export interface RegistrationInput {
  name: string
  email: string
  phone?: string
  password: string
  preferredBatchId?: string
  termsAccepted: boolean
}

export interface RegistrationMetadata {
  ip: string
  userAgent: string
  requestId: string
}

export async function registerStudent(input: RegistrationInput, metadata: RegistrationMetadata) {
  const passwordHash = await hashPassword(input.password)
  try {
    const user = await db.$transaction(async tx => {
      if (input.preferredBatchId) {
        const batch = await tx.batch.findUnique({ where: { id: input.preferredBatchId }, select: { id: true } })
        if (!batch) throw new ValidationError('Selected batch not found', { preferredBatchId: 'Invalid batch' })
      }
      const existing = await tx.user.findUnique({ where: { email: input.email }, select: { id: true } })
      if (existing) throw new ConflictError('An account with this email already exists')
      return tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          phone: input.phone || null,
          passwordHash,
          role: 'STUDENT',
          status: 'PENDING',
          preferredBatchId: input.preferredBatchId || null,
          termsAccepted: input.termsAccepted,
        },
        select: { id: true, email: true, name: true, role: true, status: true },
      })
    })
    const ctx: AuthContext = {
      user: { id: user.id, email: user.email, role: 'STUDENT', name: user.name, status: user.status, mustChangePassword: false },
      ...metadata,
    }
    await audit({ ctx, action: 'STUDENT_REGISTER', entityType: 'USER', entityId: user.id, after: { email: user.email, name: user.name, status: 'PENDING' } })
    return user
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('An account with this email already exists')
    }
    throw error
  }
}
