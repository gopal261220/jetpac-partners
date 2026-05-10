import axios from 'axios';

import { TENANT_ID } from '../../../constants/app';
import { destinationCatalog } from '../data/catalog';
import { getCandidateApiBaseUrls } from './runtime';

const PACK_INVENTORY_TIMEOUT_MS = 8000;

export type PackInventoryStatusFilter = 'all' | 'allocated' | 'unallocated';

type PackInventoryApiItem = {
  id?: string | number | null;
  catalog_id?: string | number | null;
  page_name?: string | null;
  page_slug?: string | null;
  pack_name?: string | null;
  data_allowance?: string | null;
  data?: string | null;
  validity?: string | null;
  sold_price_usd?: string | number | null;
  price_usd?: string | number | null;
  receiver_user_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  assigned_at?: string | null;
};

type PackInventoryResponse = {
  data?: PackInventoryApiItem[];
};

export type PackInventoryItem = {
  id: string;
  catalogId: string;
  destinationName: string;
  destinationFlag: string;
  packName: string;
  dataAllowance: string;
  validity: string;
  priceUsd: number;
  status: 'allocated' | 'unallocated';
  receiverUserId?: string;
  createdAt: string;
  updatedAt?: string;
};

function normalizeValue(value?: string | null) {
  return (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function resolveDestinationMeta(pageName?: string | null, pageSlug?: string | null) {
  const normalizedPageName = normalizeValue(pageName);
  const normalizedPageSlug = normalizeValue(pageSlug);

  const match =
    destinationCatalog.find((destination) => {
      const normalizedDestinationName = normalizeValue(destination.name);
      const normalizedDestinationId = normalizeValue(destination.id);
      const normalizedApiName = normalizeValue(destination.apiName);

      return (
        normalizedDestinationName === normalizedPageName ||
        normalizedDestinationId === normalizedPageName ||
        normalizedApiName === normalizedPageName ||
        normalizedDestinationName === normalizedPageSlug ||
        normalizedDestinationId === normalizedPageSlug ||
        normalizedApiName === normalizedPageSlug
      );
    }) ?? null;

  return {
    destinationName: match?.name ?? pageName ?? 'Destination',
    destinationFlag: match?.flag ?? '🌐',
  };
}

function mapPackInventoryItem(item: PackInventoryApiItem): PackInventoryItem {
  const destinationMeta = resolveDestinationMeta(item.page_name, item.page_slug);
  const catalogId = item.catalog_id != null ? String(item.catalog_id) : '';
  const createdAt = item.created_at ?? new Date().toISOString();
  const normalizedStatus = item.status?.toLowerCase() === 'allocated' ? 'allocated' : 'unallocated';

  return {
    id: item.id != null ? String(item.id) : `${catalogId || 'catalog'}-${createdAt}`,
    catalogId,
    destinationName: destinationMeta.destinationName,
    destinationFlag: destinationMeta.destinationFlag,
    packName: item.pack_name ?? 'Pack',
    dataAllowance: item.data_allowance ?? item.data ?? '--',
    validity: item.validity ?? '--',
    priceUsd: Number(item.sold_price_usd ?? item.price_usd ?? 0),
    status: normalizedStatus,
    receiverUserId: item.receiver_user_id ?? undefined,
    createdAt,
    updatedAt: item.updated_at ?? item.assigned_at ?? undefined,
  };
}

export async function fetchPackInventory(status: PackInventoryStatusFilter): Promise<PackInventoryItem[]> {
  let lastError: unknown = null;

  for (const baseUrl of getCandidateApiBaseUrls()) {
    try {
      const response = await axios.get<PackInventoryResponse>(`${baseUrl}/api/tenants/${TENANT_ID}/packs/inventory`, {
        timeout: PACK_INVENTORY_TIMEOUT_MS,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        params: status === 'all' ? undefined : { status },
      });

      return (response.data.data ?? [])
        .map(mapPackInventoryItem)
        .sort((left, right) => new Date(right.updatedAt ?? right.createdAt).getTime() - new Date(left.updatedAt ?? left.createdAt).getTime());
    } catch (error) {
      lastError = error;
    }
  }

  if (axios.isAxiosError(lastError) && lastError.code === 'ETIMEDOUT') {
    throw new Error('Pack inventory service took too long to respond.');
  }

  throw lastError;
}
