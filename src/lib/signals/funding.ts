// src/lib/signals/funding.ts
// Parses Google Search Scraper results for funding signals.

import type { ApifyDatasetItem, ParsedSignal } from '@/lib/gtm/types';
import { extractDomainFromText, extractDateFromItem } from './utils';

const FUNDING_KEYWORDS = ['raised', 'funding', 'series a', 'series b', 'seed round', 'million', 'investment'];
const EXCLUDE_KEYWORDS = ['acquisition', 'acquired', 'merger', 'layoff', 'shutdown', 'bankrupt'];

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

function extractCompanyFromFundingHeadline(headline: string): string | null {
  const patterns = [
    /^([A-Z][A-Za-z0-9\s\.]+?)\s+(?:raises?|lands?|closes?|secures?|announces?)\s+\$/i,
    /^([A-Z][A-Za-z0-9\s\.]+?)\s+(?:gets?|receives?)\s+\$[\d\.]+[MmBb]/i,
  ];

  for (const pattern of patterns) {
    const match = headline.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}
