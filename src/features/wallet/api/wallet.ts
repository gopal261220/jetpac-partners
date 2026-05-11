import axios from 'axios';

import { getCandidateApiBaseUrls } from '../../buy/api/runtime';
import { requireCurrentTenantId } from '../../../constants/app';

const WALLET_TIMEOUT_MS = 8000;

type WalletApiResponse = {
  data?: {
    tenant_id: number;
    currency: string;
    available_balance: number;
    status: string;
    last_transactions?: WalletTransactionApiItem[];
  };
};

type WalletTransactionApiItem = {
  id?: number;
  order_id: string;
  transaction_id: string;
  tenant_id?: number;
  product?: string | null;
  quantity?: number | null;
  receiver_user_id?: string;
  amount?: string | number | null;
  catalog_id?: string | number | null;
  pack_name?: string | null;
  page_name?: string | null;
  original_price_usd?: string | number | null;
  sold_price_usd?: string | number | null;
  currency: string;
  status: string;
  assignment_status?: string | null;
  transaction_type?: string | null;
  created_at: string;
};

export type WalletOverview = {
  currency: string;
  availableBalance: number;
  status: string;
};

export type WalletOrder = {
  id?: number;
  orderId: string;
  transactionId: string;
  packName?: string;
  pageName?: string;
  product?: string;
  quantity?: number;
  receiverUserId?: string;
  amountUsd?: number;
  originalPriceUsd: number;
  soldPriceUsd: number;
  currency: string;
  status: string;
  assignmentStatus?: string;
  transactionType?: string;
  createdAt: string;
};

export type WalletScreenData = {
  wallet: WalletOverview;
  orders: WalletOrder[];
};

function mapWalletResponse(payload: WalletApiResponse): WalletOverview | null {
  if (!payload.data) {
    return null;
  }

  return {
    currency: payload.data.currency,
    availableBalance: payload.data.available_balance,
    status: payload.data.status,
  };
}

function mapOrdersResponse(payload: WalletApiResponse): WalletOrder[] {
  return (payload.data?.last_transactions ?? []).map((item) => ({
    id: item.id,
    orderId: item.order_id,
    transactionId: item.transaction_id,
    packName: item.pack_name ?? undefined,
    pageName: item.page_name ?? undefined,
    product: item.product ?? undefined,
    quantity: item.quantity ?? undefined,
    receiverUserId: item.receiver_user_id,
    amountUsd: item.amount != null ? Number(item.amount) : undefined,
    originalPriceUsd: Number(item.original_price_usd ?? 0),
    soldPriceUsd: Number(item.sold_price_usd ?? 0),
    currency: item.currency,
    status: item.status,
    assignmentStatus: item.assignment_status ?? undefined,
    transactionType: item.transaction_type ?? undefined,
    createdAt: item.created_at,
  }));
}

export async function fetchWalletScreenData(limit = 20): Promise<WalletScreenData> {
  let lastError: unknown = null;
  const tenantId = requireCurrentTenantId();

  for (const baseUrl of getCandidateApiBaseUrls()) {
    try {
      const walletResponse = await axios.get<WalletApiResponse>(`${baseUrl}/api/tenants/${tenantId}/wallet`, {
        timeout: WALLET_TIMEOUT_MS,
        headers: {
          Accept: 'application/json',
        },
      });
      const wallet = mapWalletResponse(walletResponse.data);

      if (!wallet) {
        throw new Error('Wallet response was incomplete.');
      }

      return {
        wallet,
        orders: mapOrdersResponse(walletResponse.data).slice(0, limit),
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (axios.isAxiosError(lastError) && lastError.code === 'ETIMEDOUT') {
    throw new Error('Wallet service took too long to respond.');
  }

  throw lastError;
}
