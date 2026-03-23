// src/lib/signals/icp-filter.ts
import { getIcpConfig } from './types';
import type { ParsedSignal } from '@/lib/gtm/types';

export interface IcpResult {
  passes: boolean;
  reason?: string;
}

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
