import axios from 'axios';

import { TENANT_ID_STRING } from '../../../constants/app';
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
  data?: EsimInventoryApiItem[];
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

export async function fetchEsimInventory(status: EsimInventoryFilter): Promise<EsimInventoryItem[]> {
  let lastError: unknown = null;

  for (const baseUrl of getCandidateApiBaseUrls()) {
    try {
      const response = await axios.get<EsimInventoryResponse>(`${baseUrl}/api/esims/inventory/${TENANT_ID_STRING}`, {
        timeout: ESIM_INVENTORY_TIMEOUT_MS,
        headers: {
          Accept: 'application/json',
        },
        params: {
          status,
        },
      });

      return (response.data.data ?? [])
        .map(mapEsimInventoryItem)
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        );
    } catch (error) {
      lastError = error;
    }
  }

  if (axios.isAxiosError(lastError) && lastError.code === 'ETIMEDOUT') {
    throw new Error('eSIM inventory service took too long to respond.');
  }

  throw lastError;
}
