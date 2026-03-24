// src/lib/signals/funding.ts
// Parses Google Search Scraper results for funding signals.

import type { ApifyDatasetItem, ParsedSignal } from '@/lib/gtm/types';
import { extractDomainFromText, extractDateFromItem } from './utils';

const FUNDING_KEYWORDS = [
  'raised', 'raises', 'funding', 'series a', 'series b', 'series c', 'series d',
  'seed round', 'pre-seed', 'seed funding', 'million', 'billion', 'investment',
  'venture capital', 'vc funding', 'growth round', 'closes round', 'secures funding',
  'lands funding', 'bags funding', 'nabs funding', 'announces funding',
];

const EXCLUDE_KEYWORDS = [
  'acquisition', 'acquired', 'merger', 'merges with', 'layoff', 'layoffs',
  'shutdown', 'bankrupt', 'bankruptcy', 'closes down', 'shuts down', 'dissolves',
];

export function parseFundingSignals(items: ApifyDatasetItem[]): ParsedSignal[] {
  const signals: ParsedSignal[] = [];

  for (const item of items) {
    const title = String(item.title || '').toLowerCase();
    const desc  = String(item.description || '').toLowerCase();
    const combined = `${title} ${desc}`;

    if (!FUNDING_KEYWORDS.some((k) => combined.includes(k))) continue;
    if (EXCLUDE_KEYWORDS.some((k) => combined.includes(k))) continue;

    const companyName = extractCompanyFromFundingHeadline(String(item.title || ''));
    const domain = extractDomainFromText(
      String(item.url || '') + ' ' + String(item.description || '')
    );

    if (!companyName) continue;

    signals.push({
      signal_type: 'funding',
      company_name: companyName,
      company_domain: domain,
      headline: String(item.title || ''),
      signal_url: String(item.url || ''),
      signal_date: extractDateFromItem(item as Record<string, unknown>) || new Date().toISOString().split('T')[0],
      raw_data: item as Record<string, unknown>,
    });
  }

  return signals;
}

const FUNDING_VERBS = [
  'raises?', 'lands?', 'closes?', 'secures?', 'bags?', 'nabs?', 'snags?',
  'gets?', 'receives?', 'announces?', 'completes?', 'scores?', 'pulls? in',
  'clinches?', 'garners?', 'nets?', 'hauls? in',
];

const AMOUNT_PATTERN = '\\$[\\d\\.]+\\s*(?:[KMB]|million|billion|thousand)?';
const ROUND_PATTERN = '(?:seed|pre-seed|series [a-e]|growth|bridge|venture|angel)?';

function extractCompanyFromFundingHeadline(headline: string): string | null {
  const verbGroup = FUNDING_VERBS.join('|');

  const patterns = [
    // "Acme Corp Raises $10M Series A"
    new RegExp(`^([\\w][\\w\\s\\.\\-&,\']+?)\\s+(?:${verbGroup})\\s+${AMOUNT_PATTERN}`, 'i'),
    // "Acme raises Series A funding of $10M"
    new RegExp(`^([\\w][\\w\\s\\.\\-&,\']+?)\\s+(?:${verbGroup})\\s+(?:${ROUND_PATTERN}\\s+)?funding`, 'i'),
    // "$10M Series A for Acme Corp"
    new RegExp(`${AMOUNT_PATTERN}\\s+(?:${ROUND_PATTERN}\\s+)?(?:round\\s+)?(?:for|from|to)\\s+([\\w][\\w\\s\\.\\-&,\']+?)(?:\\s+[-–|]|$)`, 'i'),
    // "Acme Corp Announces $10M"
    new RegExp(`^([\\w][\\w\\s\\.\\-&,\']+?)\\s+(?:announces?|completes?)\\s+\\$`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = headline.match(pattern);
    const company = match?.[1]?.trim();
    if (company && company.length >= 2 && company.length <= 60) {
      // Strip trailing noise words
      return company.replace(/\s+(?:Inc|LLC|Ltd|Corp|Co|Group|Holdings|Technologies|Technology|Labs?|AI|Raises?|Funding)\.?$/i, '').trim();
    }
  }
  return null;
}
