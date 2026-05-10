import type { DestinationCatalog } from '../types';

export const destinationCatalog: DestinationCatalog[] = [
  {
    id: 'india',
    name: 'India',
    flag: '🇮🇳',
    region: 'South Asia',
    category: 'Popular',
    teaser: 'Fast-moving kiosk destination with low-entry packs.',
    packs: [
      { id: 'india-1gb', name: 'Starter Pack', dataAllowance: '1 GB', validity: '7 days', priceUsd: 4 },
      { id: 'india-3gb', name: 'Traveller Pack', dataAllowance: '3 GB', validity: '15 days', priceUsd: 8 },
      { id: 'india-10gb', name: 'Power Pack', dataAllowance: '10 GB', validity: '30 days', priceUsd: 17 },
    ],
  },
  {
    id: 'europe',
    name: 'Europe',
    flag: '🇪🇺',
    region: 'Multi-country',
    category: 'Regional',
    teaser: 'Popular cross-border option for multi-stop trips.',
    packs: [
      { id: 'europe-3gb', name: 'City Hop', dataAllowance: '3 GB', validity: '7 days', priceUsd: 9 },
      { id: 'europe-10gb', name: 'Euro Flex', dataAllowance: '10 GB', validity: '15 days', priceUsd: 19 },
      { id: 'europe-20gb', name: 'Grand Tour', dataAllowance: '20 GB', validity: '30 days', priceUsd: 34 },
    ],
  },
  {
    id: 'china',
    name: 'China',
    flag: '🇨🇳',
    region: 'East Asia',
    category: 'Popular',
    teaser: 'Reliable mid-tier packs for short business travel.',
    packs: [
      { id: 'china-2gb', name: 'Fast Start', dataAllowance: '2 GB', validity: '7 days', priceUsd: 6 },
      { id: 'china-5gb', name: 'Metro Pack', dataAllowance: '5 GB', validity: '15 days', priceUsd: 12 },
      { id: 'china-12gb', name: 'Business Pack', dataAllowance: '12 GB', validity: '30 days', priceUsd: 24 },
    ],
  },
  {
    id: 'japan',
    name: 'Japan',
    flag: '🇯🇵',
    region: 'East Asia',
    category: 'Popular',
    teaser: 'High-conversion packs for roaming-heavy customers.',
    packs: [
      { id: 'japan-1gb', name: 'Tokyo Lite', dataAllowance: '1 GB', validity: '5 days', priceUsd: 5 },
      { id: 'japan-5gb', name: 'Shinkansen', dataAllowance: '5 GB', validity: '15 days', priceUsd: 14 },
      { id: 'japan-15gb', name: 'Explorer', dataAllowance: '15 GB', validity: '30 days', priceUsd: 29 },
    ],
  },
  {
    id: 'usa',
    name: 'United States',
    flag: '🇺🇸',
    region: 'North America',
    category: 'Global',
    teaser: 'Strong-value plans for longer-stay travelers.',
    packs: [
      { id: 'usa-3gb', name: 'Coast to Coast', dataAllowance: '3 GB', validity: '7 days', priceUsd: 8 },
      { id: 'usa-8gb', name: 'Road Trip', dataAllowance: '8 GB', validity: '15 days', priceUsd: 18 },
      { id: 'usa-20gb', name: 'Unlimited Days', dataAllowance: '20 GB', validity: '30 days', priceUsd: 36 },
    ],
  },
  {
    id: 'thailand',
    name: 'Thailand',
    flag: '🇹🇭',
    region: 'Southeast Asia',
    category: 'Popular',
    teaser: 'Low-cost packs ideal for quick tourist activations.',
    packs: [
      { id: 'thailand-1gb', name: 'Island Lite', dataAllowance: '1 GB', validity: '7 days', priceUsd: 3 },
      { id: 'thailand-6gb', name: 'Bangkok Max', dataAllowance: '6 GB', validity: '15 days', priceUsd: 11 },
      { id: 'thailand-12gb', name: 'Holiday Pack', dataAllowance: '12 GB', validity: '30 days', priceUsd: 19 },
    ],
  },
  {
    id: 'uae',
    name: 'UAE',
    flag: '🇦🇪',
    region: 'Middle East',
    category: 'Regional',
    teaser: 'Frequent kiosk destination with premium data options.',
    packs: [
      { id: 'uae-2gb', name: 'Dubai Quick', dataAllowance: '2 GB', validity: '7 days', priceUsd: 6 },
      { id: 'uae-8gb', name: 'Business Week', dataAllowance: '8 GB', validity: '15 days', priceUsd: 16 },
      { id: 'uae-15gb', name: 'Premium Pack', dataAllowance: '15 GB', validity: '30 days', priceUsd: 27 },
    ],
  },
  {
    id: 'singapore',
    name: 'Singapore',
    flag: '🇸🇬',
    region: 'Southeast Asia',
    category: 'Global',
    teaser: 'Compact, business-friendly packs for city travelers.',
    packs: [
      { id: 'singapore-1gb', name: 'Transit Pack', dataAllowance: '1 GB', validity: '5 days', priceUsd: 4 },
      { id: 'singapore-4gb', name: 'City Break', dataAllowance: '4 GB', validity: '10 days', priceUsd: 9 },
      { id: 'singapore-10gb', name: 'Business Class', dataAllowance: '10 GB', validity: '30 days', priceUsd: 21 },
    ],
  },
  {
    id: 'australia',
    name: 'Australia',
    flag: '🇦🇺',
    region: 'Oceania',
    category: 'Regional',
    teaser: 'Longer-validity plans suited for roaming-heavy trips.',
    packs: [
      { id: 'australia-3gb', name: 'Sydney Hop', dataAllowance: '3 GB', validity: '7 days', priceUsd: 8 },
      { id: 'australia-10gb', name: 'Outback', dataAllowance: '10 GB', validity: '15 days', priceUsd: 18 },
      { id: 'australia-25gb', name: 'Roamer', dataAllowance: '25 GB', validity: '30 days', priceUsd: 39 },
    ],
  },
  {
    id: 'south-korea',
    name: 'South Korea',
    flag: '🇰🇷',
    region: 'East Asia',
    category: 'Popular',
    teaser: 'High-speed packs for short and medium city stays.',
    packs: [
      { id: 'south-korea-2gb', name: 'Seoul Start', dataAllowance: '2 GB', validity: '7 days', priceUsd: 5 },
      { id: 'south-korea-7gb', name: 'Urban Pack', dataAllowance: '7 GB', validity: '15 days', priceUsd: 13 },
      { id: 'south-korea-15gb', name: 'Creator Pack', dataAllowance: '15 GB', validity: '30 days', priceUsd: 25 },
    ],
  },
];

export function findDestinationById(destinationId: string) {
  return destinationCatalog.find((destination) => destination.id === destinationId);
}
