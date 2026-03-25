// src/lib/signals/product-hunt.ts
// Parses Product Hunt scraper results for launch signals.
// Companies launching products in B2B/SaaS/GTM categories are high-value:
// they're actively building, likely fundraising, and hiring.

import type { ApifyDatasetItem, ParsedSignal } from '@/lib/gtm/types';
import { extractDomainFromText, extractDateFromItem } from './utils';

// Categories and keywords that indicate B2B SaaS / GTM relevance
const RELEVANT_KEYWORDS = [
  'saas', 'b2b', 'sales', 'crm', 'marketing', 'revenue', 'growth',
  'automation', 'analytics', 'productivity', 'ai', 'machine learning',
  'enterprise', 'startup', 'platform', 'tool', 'software', 'api',
  'workflow', 'collaboration', 'data', 'pipeline', 'outreach',
  'engagement', 'lead', 'prospect', 'conversion', 'funnel',
];

// Exclude consumer/hobby products
const EXCLUDE_KEYWORDS = [
  'game', 'gaming', 'recipe', 'fitness', 'meditation', 'dating',
  'social media', 'photo editing', 'music', 'podcast player',
  'weather', 'personal finance', 'journal', 'diary',
];

export function parseProductHuntSignals(items: ApifyDatasetItem[]): ParsedSignal[] {
  const signals: ParsedSignal[] = [];

  for (const item of items) {
    const name = String(item.name || item.title || '');
    const tagline = String(item.tagline || item.description || '');
    const combined = `${name} ${tagline}`.toLowerCase();

    // Must match at least one relevant keyword
    if (!RELEVANT_KEYWORDS.some((k) => combined.includes(k))) continue;
    // Exclude consumer products
    if (EXCLUDE_KEYWORDS.some((k) => combined.includes(k))) continue;

    // Extract domain from the product's website URL
    const websiteUrl = String(item.url || item.website || item.websiteUrl || item.productUrl || '');
    const domain = extractDomainFromText(websiteUrl);

    // Skip if no domain — can't enrich without it
    if (!domain) continue;

    const upvotes = Number(item.votesCount || item.upvotes || item.votes || 0);
    const commentsCount = Number(item.commentsCount || item.comments || 0);

    signals.push({
      signal_type: 'news', // Product Hunt launches map to 'news' signal type
      company_name: name,
      company_domain: domain,
      headline: `${name} launched on Product Hunt — "${tagline}"${upvotes > 50 ? ` (${upvotes} upvotes)` : ''}`,
      signal_url: String(item.url || item.productUrl || ''),
      signal_date: extractDateFromItem(item as Record<string, unknown>) || new Date().toISOString().split('T')[0],
      raw_data: {
        ...item as Record<string, unknown>,
        source: 'product_hunt',
        upvotes,
        comments_count: commentsCount,
      },
    });
  }

  return signals;
}
