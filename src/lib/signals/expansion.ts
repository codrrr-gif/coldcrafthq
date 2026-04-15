// src/lib/signals/expansion.ts
// Parses Google Search results for company expansion/growth signals.
// Companies opening offices, entering markets, or hitting growth milestones
// are actively growing and likely need sales/marketing infrastructure.

import type { ApifyDatasetItem, ParsedSignal } from '@/lib/gtm/types';
import { extractDomainFromText, extractDateFromItem } from './utils';

const EXPANSION_KEYWORDS = [
  'opens new office', 'new headquarters', 'expands to', 'expanding into',
  'enters market', 'market expansion', 'plans to hire', 'hiring spree',
  'doubles revenue', 'tripled revenue', '100% growth', 'fastest growing',
  'inc 5000', 'deloitte fast 500', 'growth milestone',
  'series a', 'series b', 'series c',
  'opens office', 'launches in', 'global expansion',
  'ipo filing', 's-1 filing', 'prepares ipo',
];

const EXCLUDE_KEYWORDS = [
  'layoff', 'layoffs', 'shutdown', 'closes', 'bankruptcy',
  'downsizing', 'restructuring', 'lays off',
];

export function parseExpansionSignals(items: ApifyDatasetItem[]): ParsedSignal[] {
  const signals: ParsedSignal[] = [];
  const seenCompanies = new Set<string>();

  for (const item of items) {
    const title = String(item.title || '');
    const desc = String(item.description || '');
    const url = String(item.url || '');
    const combined = `${title} ${desc}`.toLowerCase();

    // Must match expansion keywords
    if (!EXPANSION_KEYWORDS.some(k => combined.includes(k))) continue;
    // Reject negative news
    if (EXCLUDE_KEYWORDS.some(k => combined.includes(k))) continue;

    const company = extractCompanyFromExpansionHeadline(title);
    if (!company) continue;

    const key = company.toLowerCase();
    if (seenCompanies.has(key)) continue;
    seenCompanies.add(key);

    const domain = extractDomainFromText(`${url} ${desc}`);

    signals.push({
      signal_type: 'news',
      company_name: company,
      company_domain: domain,
      headline: title,
      signal_url: url,
      signal_date: extractDateFromItem(item as Record<string, unknown>) || new Date().toISOString().split('T')[0],
      raw_data: { ...item as Record<string, unknown>, source: 'expansion_signals' },
    });
  }

  return signals;
}

function extractCompanyFromExpansionHeadline(headline: string): string | null {
  const patterns = [
    // "Acme Corp Opens New Office" / "Acme Corp Expands to Europe"
    /^([A-Z][\w\s.&'-]{1,40}?)\s+(?:opens?|expands?|enters?|launches?|plans?|doubles?|triples?|hits?|reaches?)\s+/i,
    // "Acme Corp, a B2B startup, expands..."
    /^([A-Z][\w\s.&'-]{1,40}?),\s+(?:a|an|the)\s+/i,
    // "Inside Acme Corp's Global Expansion"
    /(?:Inside|How)\s+([A-Z][\w\s.&'-]{1,40}?)(?:'s|'s)\s+/i,
  ];

  for (const pattern of patterns) {
    const match = headline.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim().replace(/\s+(?:Inc|LLC|Ltd|Corp)\.?$/i, '');
      if (name.length >= 2 && name.length <= 50) return name;
    }
  }
  return null;
}
