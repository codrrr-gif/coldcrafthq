// src/lib/signals/product-hunt-google.ts
// Parses Google Search results about Product Hunt launches.
// Used when the dedicated PH scraper actor is broken/unavailable.

import type { ApifyDatasetItem, ParsedSignal } from '@/lib/gtm/types';
import { extractDateFromItem } from './utils';

const RELEVANT_KEYWORDS = [
  'saas', 'b2b', 'sales', 'crm', 'marketing', 'revenue', 'growth',
  'automation', 'analytics', 'ai', 'platform', 'tool', 'software',
  'workflow', 'collaboration', 'pipeline', 'outreach', 'engagement',
  'api', 'startup', 'enterprise', 'productivity',
];

const EXCLUDE_KEYWORDS = [
  'game', 'gaming', 'recipe', 'fitness', 'dating', 'music',
  'podcast', 'weather', 'journal', 'diary', 'photo edit',
];

export function parseProductHuntGoogleSignals(items: ApifyDatasetItem[]): ParsedSignal[] {
  const signals: ParsedSignal[] = [];
  const seenCompanies = new Set<string>();

  for (const item of items) {
    const title = String(item.title || '');
    const desc = String(item.description || '');
    const url = String(item.url || '');
    const combined = `${title} ${desc}`.toLowerCase();

    // Relevance check
    if (!RELEVANT_KEYWORDS.some(k => combined.includes(k))) continue;
    if (EXCLUDE_KEYWORDS.some(k => combined.includes(k))) continue;

    const company = extractCompanyFromPHGoogle(title, url);
    if (!company) continue;

    const key = company.toLowerCase();
    if (seenCompanies.has(key)) continue;
    seenCompanies.add(key);

    // Extract tagline from description
    const tagline = desc.slice(0, 120);

    signals.push({
      signal_type: 'news',
      company_name: company,
      company_domain: null, // PH URLs don't have company domains — resolver will handle
      headline: `${company} launched on Product Hunt — "${tagline}"`,
      signal_url: url,
      signal_date: extractDateFromItem(item as Record<string, unknown>) || new Date().toISOString().split('T')[0],
      raw_data: { ...item as Record<string, unknown>, source: 'product_hunt_google' },
    });
  }

  return signals;
}

function extractCompanyFromPHGoogle(title: string, url: string): string | null {
  // PH Google result: "Acme - AI-powered sales tools | Product Hunt"
  const phMatch = title.match(/^([\w][\w\s.&'-]{1,40}?)\s*[-–|]\s*/);
  if (phMatch?.[1]) {
    const name = phMatch[1].trim();
    if (name.length >= 2 && name.length <= 50
      && !name.toLowerCase().includes('product hunt')
      && !name.toLowerCase().includes('producthunt')) {
      return name;
    }
  }

  // From URL: producthunt.com/posts/acme-tool → "Acme Tool"
  const urlMatch = url.match(/producthunt\.com\/posts\/([\w-]+)/);
  if (urlMatch?.[1]) {
    return urlMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  return null;
}
