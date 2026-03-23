// src/lib/signals/job-postings.ts
// Parses LinkedIn Jobs Scraper results.

import type { ApifyDatasetItem, ParsedSignal } from '@/lib/gtm/types';
import { extractDomainFromText } from './utils';

const HIGH_VALUE_TITLES = [
  'vp sales', 'vp of sales', 'head of sales', 'chief revenue',
  'vp marketing', 'head of growth', 'head of marketing', 'cmo',
  'revenue operations', 'sales operations', 'director of sales',
  'business development', 'vp business development',
];

export function parseJobPostingSignals(items: ApifyDatasetItem[]): ParsedSignal[] {
  const signals: ParsedSignal[] = [];

  for (const item of items) {
    const title   = String(item.title || item.jobTitle || '').toLowerCase();
    const company = String(item.company || item.companyName || '');
    const url     = String(item.url || item.jobUrl || '');

    if (!company || !HIGH_VALUE_TITLES.some((t) => title.includes(t))) continue;

    const domain = extractDomainFromText(url) ||
      extractDomainFromText(String(item.companyUrl || ''));

    signals.push({
      signal_type: 'job_posting',
      company_name: company,
      company_domain: domain,
      headline: `${company} is hiring: ${String(item.title || item.jobTitle || '')}`,
      signal_url: url,
      signal_date: new Date().toISOString().split('T')[0],
      raw_data: item as Record<string, unknown>,
    });
  }

  return signals;
}
