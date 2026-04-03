// src/lib/signals/leadership.ts
// Parses Google News results for leadership change signals.

import type { ApifyDatasetItem, ParsedSignal } from '@/lib/gtm/types';
import { extractDomainFromText, extractDateFromItem } from './utils';

const LEADERSHIP_KEYWORDS = [
  'appoints', 'appointed', 'hires', 'hired', 'joins as', 'joined as',
  'named', 'promoted to', 'welcomes', 'taps', 'elevates',
  'new vp', 'new head of', 'new chief', 'new cro', 'new cmo',
  'brings on', 'onboards', 'names new',
];

const TARGET_ROLES = [
  'vp sales', 'vp of sales', 'chief revenue', 'cro', 'head of sales',
  'vp marketing', 'cmo', 'head of growth', 'vp business development',
  'director of sales', 'head of revenue', 'chief marketing',
  'chief commercial', 'cco', 'head of demand', 'svp sales', 'svp marketing',
  'vp revenue', 'head of partnerships', 'chief growth',
  'ceo', 'founder', 'co-founder', 'president', 'managing director',
];

export function parseLeadershipSignals(items: ApifyDatasetItem[]): ParsedSignal[] {
  const signals: ParsedSignal[] = [];

  for (const item of items) {
    const title    = String(item.title || '').toLowerCase();
    const desc     = String(item.description || '').toLowerCase();
    const combined = `${title} ${desc}`;

    // Require a leadership action keyword
    if (!LEADERSHIP_KEYWORDS.some((k) => combined.includes(k))) continue;

    // Accept if EITHER a target role is mentioned OR the headline indicates a C-level/VP hire
    const hasTargetRole = TARGET_ROLES.some((r) => combined.includes(r));
    const hasSeniorTitle = /\b(vp|vice president|svp|evp|chief|c-suite|head of|director of)\b/i.test(combined);
    if (!hasTargetRole && !hasSeniorTitle) continue;

    const companyName = extractCompanyFromLeadershipHeadline(String(item.title || ''));
    const domain = extractDomainFromText(
      String(item.url || '') + ' ' + String(item.description || '')
    );

    if (!companyName) continue;

    signals.push({
      signal_type: 'leadership_change',
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

function extractCompanyFromLeadershipHeadline(headline: string): string | null {
  const patterns = [
    /^([A-Z][A-Za-z0-9\s\.&,]+?)\s+(?:appoints?|names?|hires?|promotes?)\s+/i,
    /\bjoins\s+([A-Z][A-Za-z0-9\s\.&,]+?)\s+as\b/i,
  ];
  for (const pattern of patterns) {
    const match = headline.match(pattern);
    if (match?.[1] && match[1].length < 50) return match[1].trim();
  }
  return null;
}
