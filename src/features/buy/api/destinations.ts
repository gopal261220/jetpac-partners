import axios from 'axios';

import { destinationCatalog } from '../data/catalog';
import type { DestinationCatalog, DestinationCategory } from '../types';
import { getCandidateApiBaseUrls } from './runtime';

const DESTINATIONS_TIMEOUT_MS = 8000;

type RemoteDestinationPage = {
  name: string;
  display_name: string;
};

type RemoteDestinationResponse = {
  data?: RemoteDestinationPage[];
};

const FLAG_BY_NAME: Record<string, string> = {
  'Asia-Pacific': '🌏',
  Caribbean: '🏝️',
  Europe: '🇪🇺',
  Global: '🌐',
  Indonesia: '🇮🇩',
  'Latin America': '🌎',
  Malaysia: '🇲🇾',
  'Middle East and North Africa': '🌍',
  'North America': '🌎',
  'Southeast Asia': '🌏',
  Thailand: '🇹🇭',
  'United Kingdom': '🇬🇧',
};

const REGION_BY_NAME: Record<string, string> = {
  'Asia-Pacific': 'Regional',
  Caribbean: 'Regional',
  Europe: 'Multi-country',
  Global: 'Worldwide',
  Indonesia: 'Southeast Asia',
  'Latin America': 'Regional',
  Malaysia: 'Southeast Asia',
  'Middle East and North Africa': 'Regional',
  'North America': 'Regional',
  'Southeast Asia': 'Regional',
  Thailand: 'Southeast Asia',
  'United Kingdom': 'Europe',
};

const CATEGORY_BY_NAME: Record<string, DestinationCategory> = {
  'Asia-Pacific': 'Regional',
  Caribbean: 'Regional',
  Europe: 'Regional',
  Global: 'Global',
  Indonesia: 'Popular',
  'Latin America': 'Regional',
  Malaysia: 'Popular',
  'Middle East and North Africa': 'Regional',
  'North America': 'Global',
  'Southeast Asia': 'Regional',
  Thailand: 'Popular',
  'United Kingdom': 'Popular',
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeValue(value: string) {
  return slugify(value.replace(/-esim$/i, ''));
}

function matchFallbackDestination(remoteDestination: RemoteDestinationPage) {
  const remoteName = normalizeValue(remoteDestination.display_name);
  const remoteSlug = normalizeValue(remoteDestination.name);

  return destinationCatalog.find((destination) => {
    const localId = normalizeValue(destination.id);
    const localName = normalizeValue(destination.name);

    return (
      localId === remoteName ||
      localName === remoteName ||
      localId === remoteSlug ||
      localName === remoteSlug
    );
  });
}

function mapRemoteDestination(remoteDestination: RemoteDestinationPage): DestinationCatalog {
  const fallbackDestination = matchFallbackDestination(remoteDestination);
  const id = normalizeValue(remoteDestination.name);
  const name = remoteDestination.display_name;

  if (fallbackDestination) {
    return {
      ...fallbackDestination,
      id,
      apiName: remoteDestination.name,
      name,
      flag: FLAG_BY_NAME[name] ?? fallbackDestination.flag,
      region: REGION_BY_NAME[name] ?? fallbackDestination.region,
      category: CATEGORY_BY_NAME[name] ?? fallbackDestination.category,
      teaser: fallbackDestination.teaser,
    };
  }

  return {
    id,
    apiName: remoteDestination.name,
    name,
    flag: FLAG_BY_NAME[name] ?? '📍',
    region: REGION_BY_NAME[name] ?? 'Regional',
    category: CATEGORY_BY_NAME[name] ?? 'Regional',
    teaser: `Fast-moving ${name.toLowerCase()} packs for quick partner allocation.`,
    packs: [],
  };
}

export async function fetchDestinationCatalog(): Promise<DestinationCatalog[]> {
  let lastError: unknown = null;

  for (const baseUrl of getCandidateApiBaseUrls()) {
    try {
      const response = await axios.get<RemoteDestinationResponse>(`${baseUrl}/api/pages`, {
        timeout: DESTINATIONS_TIMEOUT_MS,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!Array.isArray(response.data?.data) || !response.data.data.length) {
        return [];
      }

      return response.data.data.map(mapRemoteDestination);
    } catch (error) {
      lastError = error;
    }
  }

  if (axios.isAxiosError(lastError) && lastError.code === 'ETIMEDOUT') {
    throw new Error('Destination service took too long to respond.');
  }

  throw lastError;
}
