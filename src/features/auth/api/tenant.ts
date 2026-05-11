import axios from 'axios';

import { getCandidateApiBaseUrls } from '../../buy/api/runtime';

const TENANT_CHECK_TIMEOUT_MS = 8000;

type TenantCheckApiResponse = {
  data?: {
    id?: number;
    tenant_code?: string;
    company_name?: string;
    status?: string;
    is_active?: boolean;
    contact_person?: string;
  } | null;
};

export type TenantProfile = {
  id: number;
  tenantCode?: string;
  companyName?: string;
  status?: string;
  isActive?: boolean;
  contactPerson?: string;
};

function mapTenantProfile(payload: TenantCheckApiResponse): TenantProfile | null {
  if (typeof payload.data?.id !== 'number') {
    return null;
  }

  return {
    id: payload.data.id,
    tenantCode: payload.data.tenant_code,
    companyName: payload.data.company_name,
    status: payload.data.status,
    isActive: payload.data.is_active,
    contactPerson: payload.data.contact_person,
  };
}

export async function fetchTenantByEmail(email: string): Promise<TenantProfile | null> {
  let lastError: unknown = null;

  for (const baseUrl of getCandidateApiBaseUrls()) {
    try {
      const response = await axios.get<TenantCheckApiResponse>(`${baseUrl}/api/tenants/check`, {
        timeout: TENANT_CHECK_TIMEOUT_MS,
        headers: {
          Accept: 'application/json',
        },
        params: {
          email,
        },
        validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
      });

      if (response.status === 404) {
        return null;
      }

      return mapTenantProfile(response.data);
    } catch (error) {
      lastError = error;
    }
  }

  if (axios.isAxiosError(lastError) && lastError.code === 'ETIMEDOUT') {
    throw new Error('Tenant lookup service took too long to respond.');
  }

  throw lastError;
}
