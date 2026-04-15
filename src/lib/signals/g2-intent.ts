// src/lib/signals/g2-intent.ts
// Parses Google Search results from G2/Capterra for competitor review signals.
// Companies listed on review sites are real B2B products — potential outbound targets.

import type { ApifyDatasetItem, ParsedSignal } from '@/lib/gtm/types';
import { extractDateFromItem } from './utils';

export function parseG2IntentSignals(items: ApifyDatasetItem[]): ParsedSignal[] {
  const signals: ParsedSignal[] = [];
  const seenCompanies = new Set<string>();

  for (const item of items) {
    const title = String(item.title || '');
    const url = String(item.url || '');

    const company = extractCompanyFromReviewPage(title, url);
    if (!company) continue;

    // Dedupe
    const key = company.toLowerCase();
    if (seenCompanies.has(key)) continue;
    seenCompanies.add(key);

    // Try to extract domain from G2/Capterra product page URL
    // G2 URLs: g2.com/products/acme-corp/reviews → domain might be acme-corp.com (needs resolver)
    // Capterra URLs: capterra.com/software/.../acme-corp
    const domain = extractDomainFromG2Url(url);

    signals.push({
      signal_type: 'competitor_review',
      company_name: company,
      company_domain: domain, // May be null — domain resolver will handle in check route
      headline: `${company} listed on software review site — ${title.slice(0, 80)}`,
      signal_url: url,
      signal_date: extractDateFromItem(item as Record<string, unknown>) || new Date().toISOString().split('T')[0],
      raw_data: { ...item as Record<string, unknown>, source: 'g2_reviews' },
    });
  }

  return signals;
}

function extractCompanyFromReviewPage(title: string, url: string): string | null {
  // G2: "Acme Reviews and Pricing - 2026" or "Acme Reviews | G2"
  const g2Match = title.match(/^([\w][\w\s.&'-]{1,40}?)\s+(?:Reviews?|Pricing|Features|Alternatives)/i);
  if (g2Match?.[1]) {
    const name = g2Match[1].trim().replace(/\s*[-|]\s*$/, '');
    if (name.length >= 2 && name.length <= 50) return name;
  }

  // "Best X Alternatives" → extract X
  const altMatch = title.match(/Best\s+([\w][\w\s.&'-]{1,40}?)\s+Alternatives/i);
  if (altMatch?.[1]) return altMatch[1].trim();

  // Extract from G2 URL: /products/acme-corp/ → "Acme Corp"
  const urlMatch = url.match(/g2\.com\/products\/([\w-]+)/);
  if (urlMatch?.[1]) {
    return urlMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Capterra URL: /software/.../acme-corp
  const capterraMatch = url.match(/capterra\.com\/software\/\d+\/([\w-]+)/);
  if (capterraMatch?.[1]) {
    return capterraMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractDomainFromG2Url(url: string): string | null {
  // G2 product URLs don't contain the company's actual domain
  // The domain resolver in the check route will handle this via Perplexity
  // We return null and let it be resolved
  return null;
}
