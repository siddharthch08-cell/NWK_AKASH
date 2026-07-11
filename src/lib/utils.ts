import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))]
}
