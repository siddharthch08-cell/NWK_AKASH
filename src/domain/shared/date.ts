import { ValidationError } from '../errors'

/** Parse API date input consistently. Offset-less values are interpreted as UTC. */
export function parseApiDate(value: string | null | undefined, field: string): Date | null {
  if (value == null || value === '') return null
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) throw new ValidationError(`Invalid ${field}`, { [field]: 'Must be a valid ISO-8601 date' })
  return date
}

export function assertDateRange(start: Date | null, end: Date | null, startField = 'startAt', endField = 'endAt') {
  if (start && end && start >= end) throw new ValidationError(`${endField} must be after ${startField}`, { [endField]: `Must be after ${startField}` })
}
