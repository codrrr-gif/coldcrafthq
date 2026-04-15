// src/lib/signals/indeed-jobs.ts
// Parses Google Search results from Indeed/Glassdoor for job posting signals.
// Extends job coverage beyond LinkedIn.

import type { ApifyDatasetItem, ParsedSignal } from '@/lib/gtm/types';
import { extractDomainFromText, extractDateFromItem } from './utils';

const HIGH_VALUE_TITLES = [
  'vp sales', 'vp of sales', 'head of sales', 'chief revenue', 'cro',
  'vp marketing', 'cmo', 'head of growth', 'head of marketing',
  'director of sales', 'sales director', 'revenue operations',
  'head of demand', 'vp business development', 'business development director',
  'head of revenue', 'chief commercial', 'vp revenue',
  'director of growth', 'head of partnerships', 'director demand gen',
];

export function parseIndeedJobSignals(items: ApifyDatasetItem[]): ParsedSignal[] {
  const signals: ParsedSignal[] = [];
  const seenCompanies = new Set<string>();

  for (const item of items) {
    const title = String(item.title || '');
    const desc = String(item.description || '');
    const url = String(item.url || '');
    const titleLower = title.toLowerCase();
    const descLower = desc.toLowerCase();

    // Must contain a high-value role
    if (!HIGH_VALUE_TITLES.some(t => titleLower.includes(t) || descLower.includes(t))) continue;

    // Extract company name — Indeed titles are "Role - Company - Location | Indeed.com"
    const company = extractCompanyFromIndeed(title);
    if (!company) continue;

    // Dedupe by company
    const key = company.toLowerCase();
    if (seenCompanies.has(key)) continue;
    seenCompanies.add(key);

    // Try to get domain from the description or URL
    const domain = extractDomainFromText(desc);

    // Extract the actual role from the title
    const role = title.split(/\s*[-–|]\s*/)[0]?.trim() || title;

    signals.push({
      signal_type: 'job_posting',
      company_name: company,
      company_domain: domain,
      headline: `${company} is hiring: ${role} (via Indeed)`,
      signal_url: url,
      signal_date: extractDateFromItem(item as Record<string, unknown>) || new Date().toISOString().split('T')[0],
      raw_data: { ...item as Record<string, unknown>, source: 'indeed_jobs' },
    });
  }

  return signals;
}

function extractCompanyFromIndeed(title: string): string | null {
  // Indeed format: "VP of Sales - Acme Inc - San Francisco, CA | Indeed.com"
  // Glassdoor: "VP of Sales at Acme Inc | Glassdoor"
  const parts = title.split(/\s*[-–|]\s*/);

  // Indeed: company is usually the second segment
  if (parts.length >= 3) {
    const candidate = parts[1]?.trim();
    if (candidate && candidate.length >= 2 && candidate.length <= 60
      && !candidate.toLowerCase().includes('indeed')
      && !candidate.toLowerCase().includes('glassdoor')
      && !candidate.toLowerCase().includes('remote')
      && !/^[\d,]+$/.test(candidate)) {
      return candidate;
    }
  }

  // "at Company" pattern
  const atMatch = title.match(/\bat\s+([A-Z][\w\s.&-]{1,50}?)(?:\s*[|–-]|$)/i);
  if (atMatch?.[1]) return atMatch[1].trim();

  return null;
}
