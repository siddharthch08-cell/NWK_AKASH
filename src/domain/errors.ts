/**
 * Domain error types for the domain service layer.
 * Routes catch these and map to HTTP responses via the fail() helper.
 */

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
    public readonly status = 400,
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string, entity = 'Resource') {
    super('NOT_FOUND', `${entity} not found: ${message}`, undefined, 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super('CONFLICT', message, undefined, 409)
    this.name = 'ConflictError'
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, fields?: Record<string, string>) {
    super('VALIDATION_ERROR', message, fields, 422)
    this.name = 'ValidationError'
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'You do not have permission to perform this action') {
    super('FORBIDDEN', message, undefined, 403)
    this.name = 'ForbiddenError'
  }
}

export class CapacityError extends DomainError {
  constructor(message: string) {
    super('CAPACITY_EXCEEDED', message, undefined, 422)
    this.name = 'CapacityError'
  }
}
