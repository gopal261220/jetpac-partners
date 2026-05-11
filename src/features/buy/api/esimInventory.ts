import axios from 'axios';

import { requireCurrentTenantIdString } from '../../../constants/app';
import { getCandidateApiBaseUrls } from './runtime';

const ESIM_INVENTORY_TIMEOUT_MS = 8000;

export type EsimInventoryFilter = 'all' | 'active' | 'released' | 'installed';

type EsimInventoryApiItem = {
  id: number;
  created_at: string;
  updated_at: string;
  iccid: string;
  qr_code: string;
  status: string;
  tenant_id: string;
  user_email?: string;
  user_id?: string;
  vendor: string;
};

type EsimInventoryResponse = {
  data?: {
    tenant_id: string;
    available_count: number;
    esims?: EsimInventoryApiItem[];
  };
};

export type EsimInventoryItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
  iccid: string;
  qrCode: string;
  status: string;
  tenantId: string;
  userEmail?: string;
  userId?: string;
  vendor: string;
};

export type EsimInventoryData = {
  availableCount: number;
  items: EsimInventoryItem[];
};

function mapEsimInventoryItem(item: EsimInventoryApiItem): EsimInventoryItem {
  return {
    id: String(item.id),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    iccid: item.iccid,
    qrCode: item.qr_code,
    status: item.status,
    tenantId: item.tenant_id,
    userEmail: item.user_email,
    userId: item.user_id,
    vendor: item.vendor,
  };
}

export async function fetchEsimInventory(status: EsimInventoryFilter): Promise<EsimInventoryData> {
  let lastError: unknown = null;
  const tenantId = requireCurrentTenantIdString();

  for (const baseUrl of getCandidateApiBaseUrls()) {
    try {
      const response = await axios.get<EsimInventoryResponse>(`${baseUrl}/api/esims/inventory/${tenantId}`, {
        timeout: ESIM_INVENTORY_TIMEOUT_MS,
        headers: {
          Accept: 'application/json',
        },
        params: {
          status,
        },
      });

      const payload = response.data.data;

      return {
        availableCount: payload?.available_count ?? 0,
        items: (payload?.esims ?? [])
          .map(mapEsimInventoryItem)
          .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (axios.isAxiosError(lastError) && lastError.code === 'ETIMEDOUT') {
    throw new Error('eSIM inventory service took too long to respond.');
  }

  throw lastError;
}
