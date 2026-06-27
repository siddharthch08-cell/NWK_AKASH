import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'private-uploads')
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

const ALLOWED_EXT = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'txt', 'doc', 'docx', 'xls', 'xlsx',
])

export interface UploadedFile {
  storageKey: string
  fileName: string
  fileType: string
  fileSize: number
}

export function sanitizeFileName(name: string): string {
  // Strip path separators, control chars, and dangerous prefixes
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '')
  return base.slice(0, 200) || 'file'
}

export function validateUpload(file: File, maxMb: number): string | null {
  if (file.size === 0) return 'File is empty'
  if (file.size > maxMb * 1024 * 1024) return `File exceeds ${maxMb}MB limit`
  const mimeOk = ALLOWED_MIME.has(file.type)
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const extOk = ALLOWED_EXT.has(ext)
  if (!mimeOk && !extOk) return 'Unsupported file type'
  return null
}

export async function saveUpload(file: File, maxMb: number): Promise<UploadedFile> {
  const err = validateUpload(file, maxMb)
  if (err) throw new Error(err)

  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const safeBase = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''))
  const id = randomUUID()
  const storageKey = `${id}_${safeBase}.${ext}`
  const fullPath = path.join(UPLOAD_DIR, storageKey)

  const buffer = Buffer.from(await file.arrayBuffer())
  // Light magic-byte check for PDF & images
  if (ext === 'pdf' && !buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new Error('File does not look like a valid PDF')
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    const sig = buffer.subarray(0, 4).toString('hex')
    const validSigs = [
      '89504e47', // PNG
      'ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8', // JPEG
      '47494638', // GIF
      '52494646', // WEBP (RIFF)
    ]
    if (!validSigs.some((s) => sig.startsWith(s.slice(0, 8)))) {
      throw new Error('File does not match its extension signature')
    }
  }

  await fs.writeFile(fullPath, buffer)
  return {
    storageKey,
    fileName: file.name,
    fileType: file.type || `application/${ext}`,
    fileSize: file.size,
  }
}

export function uploadPath(storageKey: string): string {
  // Guard against path traversal — only allow our sanitized key format
  if (!/^[a-zA-Z0-9-]+_[a-zA-Z0-9._-]+\.[a-zA-Z0-9]+$/.test(storageKey)) {
    throw new Error('Invalid storage key')
  }
  return path.join(UPLOAD_DIR, storageKey)
}

export async function readUpload(storageKey: string): Promise<Buffer> {
  return fs.readFile(uploadPath(storageKey))
}
