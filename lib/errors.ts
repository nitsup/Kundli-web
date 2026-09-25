export class AppError extends Error {
  constructor(
    public readonly code: 'validation' | 'authentication' | 'authorization' | 'not_found' | 'calculation' | 'external_provider' | 'database' | 'rate_limit' | 'configuration' | 'unknown',
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function createValidationError(message: string, details?: unknown) {
  return new AppError('validation', message, details);
}
