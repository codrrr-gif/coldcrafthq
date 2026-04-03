// src/lib/signals/icp-filter.ts
import { getIcpConfig } from './types';
import type { ParsedSignal } from '@/lib/gtm/types';

export interface IcpResult {
  passes: boolean;
  reason?: string;
}

// Non-B2B industries detectable from company name or headline
const NON_B2B_PATTERNS = [
  // Hospitality / Real estate
  'hotel', 'resort', 'motel', 'lodge', 'hospitality', 'real estate', 'realty',
  'luxury living', 'luxury & associates', 'property management',
  // Retail / Consumer
  'retail', 'merchandise', 'clothing', 'fashion', 'jewelry', 'florist',
  'bakery', 'restaurant', 'cafe', 'bar & grill', 'pizza', 'brewery',
  // Healthcare (non-SaaS)
  'hospital', 'clinic', 'dental', 'medical center', 'healthcare system',
  'nursing', 'hospice', 'pharmacy',
  // Government / Education
  'county', 'city of', 'state of', 'department of', 'university',
  'school district', 'public school', 'college of',
  // Non-profit
  'foundation', 'charity', 'church', 'ministry', 'association of',
  // Heavy industry (non-ICP, too large or B2C)
  'petroleum', 'mining', 'oil & gas', 'christmas lights',
];

// Check if a parsed signal passes ICP filters
export function filterSignalByIcp(signal: ParsedSignal): IcpResult {
  // Must have a domain to be actionable
  if (!signal.company_domain) {
    return { passes: false, reason: 'no_domain' };
  }

  // Exclude known non-ICP TLDs
  const excluded = ['gov', 'edu', 'mil', 'ac.uk', 'org'];
  if (excluded.some((tld) => signal.company_domain!.endsWith(`.${tld}`))) {
    return { passes: false, reason: 'excluded_tld' };
  }

  // Exclude non-target geographies (by TLD — lightweight, no API needed)
  const nonTargetTlds = ['.cn', '.ru', '.kr', '.jp', '.om', '.pk', '.bd', '.ir', '.iq'];
  if (nonTargetTlds.some(tld => signal.company_domain!.endsWith(tld))) {
    return { passes: false, reason: 'non_target_geography' };
  }

  // Exclude non-B2B industries detectable from company name
  const config = getIcpConfig();
  if (signal.company_name) {
    const name = signal.company_name.toLowerCase();
    const headline = (signal.headline || '').toLowerCase();
    const combined = `${name} ${headline}`;

    // Check against configured excludeIndustries
    if (config.excludeIndustries.some(ind => combined.includes(ind))) {
      return { passes: false, reason: `excluded_industry` };
    }

    // Check against non-B2B name patterns
    if (NON_B2B_PATTERNS.some(p => name.includes(p))) {
      return { passes: false, reason: 'non_b2b_company' };
    }
  }

  return { passes: true };
}

// Check if a title matches ICP target titles
export function isTitleInIcp(title: string): boolean {
  const config = getIcpConfig();
  const normalized = title.toLowerCase();
  return config.targetTitles.some((t) => normalized.includes(t));
}

// Check if a location matches target geographies
export function isLocationInIcp(location: string): boolean {
  const config = getIcpConfig();
  return config.targetGeographies.some((g) =>
    location.toLowerCase().includes(g.toLowerCase())
  );
}
