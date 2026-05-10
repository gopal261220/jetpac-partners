import axios from 'axios';

import { TENANT_ID_STRING } from '../../../constants/app';
import { getCandidateApiBaseUrls } from './runtime';

const ESIM_ORDER_TIMEOUT_MS = 12000;

type OrderEsimsResponse = {
  data?: {
    tenant_id: string;
    quantity: number;
  };
};

export async function orderEsims(quantity: number) {
  let lastError: unknown = null;

  for (const baseUrl of getCandidateApiBaseUrls()) {
    try {
      const response = await axios.post<OrderEsimsResponse>(
        `${baseUrl}/api/esims/order`,
        {
          tenant_id: TENANT_ID_STRING,
          quantity,
        },
        {
          timeout: ESIM_ORDER_TIMEOUT_MS,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      lastError = error;
    }
  }

  if (axios.isAxiosError(lastError) && lastError.code === 'ETIMEDOUT') {
    throw new Error('eSIM order service took too long to respond.');
  }

  throw lastError;
}
