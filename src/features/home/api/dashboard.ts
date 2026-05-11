import axios from 'axios';

import { getCandidateApiBaseUrls } from '../../buy/api/runtime';
import { DEFAULT_TIMEZONE, requireCurrentTenantId } from '../../../constants/app';

const HOME_TIMEOUT_MS = 8000;

type WalletTransactionResponse = {
  id: number;
  currency: string;
  amount: number;
  status: string;
  product: string;
  order_id: string;
  transaction_type: string;
  transaction_id: string;
  created_at: string;
};

type WalletApiResponse = {
  data?: {
    tenant_id: number;
    currency: string;
    available_balance: number;
    status: string;
    last_transactions: WalletTransactionResponse[];
  };
};

type SummaryApiResponse = {
  data?: {
    tenant_id: number;
    date: string;
    timezone: string;
    currency: string;
    today_revenue_usd: string;
    today_packs_sold: number;
  };
};

export type WalletSummary = {
  currency: string;
  availableBalance: number;
  status: string;
  lastTransactions: WalletTransactionResponse[];
};

export type OrdersSummary = {
  date: string;
  timezone: string;
  currency: string;
  todayRevenueUsd: number;
  todayPacksSold: number;
};

export type HomeDashboardData = {
  wallet: WalletSummary;
  ordersSummary: OrdersSummary;
};

function mapWalletResponse(payload: WalletApiResponse): WalletSummary | null {
  if (!payload.data) {
    return null;
  }

  return {
    currency: payload.data.currency,
    availableBalance: payload.data.available_balance,
    status: payload.data.status,
    lastTransactions: payload.data.last_transactions ?? [],
  };
}

function mapSummaryResponse(payload: SummaryApiResponse): OrdersSummary | null {
  if (!payload.data) {
    return null;
  }

  return {
    date: payload.data.date,
    timezone: payload.data.timezone,
    currency: payload.data.currency,
    todayRevenueUsd: Number(payload.data.today_revenue_usd),
    todayPacksSold: payload.data.today_packs_sold,
  };
}

export async function fetchHomeDashboard(timezone = DEFAULT_TIMEZONE): Promise<HomeDashboardData> {
  let lastError: unknown = null;
  const tenantId = requireCurrentTenantId();

  for (const baseUrl of getCandidateApiBaseUrls()) {
    try {
      const [walletResponse, summaryResponse] = await Promise.all([
        axios.get<WalletApiResponse>(`${baseUrl}/api/tenants/${tenantId}/wallet`, {
          timeout: HOME_TIMEOUT_MS,
          headers: {
            Accept: 'application/json',
          },
        }),
        axios.get<SummaryApiResponse>(`${baseUrl}/api/tenants/${tenantId}/orders/summary`, {
          timeout: HOME_TIMEOUT_MS,
          headers: {
            Accept: 'application/json',
          },
          params: {
            timezone,
          },
        }),
      ]);

      const wallet = mapWalletResponse(walletResponse.data);
      const ordersSummary = mapSummaryResponse(summaryResponse.data);

      if (!wallet || !ordersSummary) {
        throw new Error('Home dashboard response was incomplete.');
      }

      return {
        wallet,
        ordersSummary,
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (axios.isAxiosError(lastError) && lastError.code === 'ETIMEDOUT') {
    throw new Error('Dashboard service took too long to respond.');
  }

  throw lastError;
}
