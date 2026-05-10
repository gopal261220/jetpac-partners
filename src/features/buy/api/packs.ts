import axios from 'axios';

import type { DataPack } from '../types';
import { getCandidateApiBaseUrls } from './runtime';

const PACKS_TIMEOUT_MS = 8000;

type RemotePack = {
  id: number | string;
  country_name: string;
  data_in_gb: number;
  validity_in_days: number;
  price_usd: string | number;
};

type RemotePacksResponse = {
  data?: RemotePack[];
};

function formatDataAllowance(dataInGb: number) {
  if (dataInGb < 0) {
    return 'Unlimited';
  }

  return `${dataInGb} GB`;
}

function formatPackName(dataAllowance: string) {
  return dataAllowance === 'Unlimited' ? 'Unlimited Plan' : `${dataAllowance} Plan`;
}

function formatValidity(days: number) {
  return `${days} day${days === 1 ? '' : 's'}`;
}

function mapRemotePack(pack: RemotePack): DataPack {
  const dataAllowance = formatDataAllowance(pack.data_in_gb);

  return {
    id: String(pack.id),
    name: formatPackName(dataAllowance),
    dataAllowance,
    validity: formatValidity(pack.validity_in_days),
    priceUsd: Number(pack.price_usd),
  };
}

export async function fetchDestinationPacks(destinationApiName: string): Promise<DataPack[]> {
  let lastError: unknown = null;

  for (const baseUrl of getCandidateApiBaseUrls()) {
    try {
      const response = await axios.get<RemotePacksResponse>(`${baseUrl}/api/packs`, {
        timeout: PACKS_TIMEOUT_MS,
        headers: {
          Accept: 'application/json',
        },
        params: {
          destination: destinationApiName,
        },
      });

      if (!Array.isArray(response.data?.data) || !response.data.data.length) {
        return [];
      }

      return response.data.data.map(mapRemotePack);
    } catch (error) {
      lastError = error;
    }
  }

  if (axios.isAxiosError(lastError) && lastError.code === 'ETIMEDOUT') {
    throw new Error('Pack service took too long to respond.');
  }

  throw lastError;
}
