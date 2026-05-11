export class TenantAccessError extends Error {
  constructor(message = 'No tenant is registered for this email address.') {
    super(message);
    this.name = 'TenantAccessError';
  }
}

export function isTenantAccessError(error: unknown): error is TenantAccessError {
  return error instanceof TenantAccessError;
}
