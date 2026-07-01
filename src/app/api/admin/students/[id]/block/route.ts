import { NextRequest } from 'next/server'
import { handleStatusChange } from '@/lib/student-status'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, params: Params) {
  return handleStatusChange(req, params, 'BLOCKED', 'STUDENT_BLOCKED', ['ACTIVE', 'APPROVED', 'INACTIVE', 'PENDING'])
}
