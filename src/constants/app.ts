export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

let currentTenantId: number | null = null;

export function setCurrentTenantId(tenantId: number | null | undefined) {
  currentTenantId = typeof tenantId === 'number' && Number.isFinite(tenantId) ? tenantId : null;
}

export function requireCurrentTenantId() {
  if (currentTenantId == null) {
    throw new Error('Tenant session is unavailable. Please sign in again.');
  }

  return currentTenantId;
}

export function requireCurrentTenantIdString() {
  return String(requireCurrentTenantId());
}
