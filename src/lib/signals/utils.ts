// src/lib/signals/utils.ts
// Shared utilities for signal parsers

// Extract a company domain from free text
export function extractDomainFromText(text: string): string | null {
  const domainPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g;
  const matches = Array.from(text.matchAll(domainPattern)).map((m) => m[0]);
  if (!matches.length) return null;

  // Filter out known news/social sites
  const excluded = [
    'techcrunch.com', 'crunchbase.com', 'linkedin.com', 'twitter.com',
    'forbes.com', 'businesswire.com', 'prnewswire.com', 'google.com',
    'bloomberg.com', 'reuters.com', 'wsj.com', 'ft.com', 'x.com',
  ];

  for (const match of matches) {
    const domain = match.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase();
    if (!excluded.includes(domain) && domain.includes('.') && domain.length > 4) {
      return domain;
    }
  }
  return null;
}

// Extract a date from an Apify dataset item
export function extractDateFromItem(item: Record<string, unknown>): string | null {
  const raw = item.date || item.publishedAt || item.datePublished || item.created_at;
  if (!raw) return null;
  try {
    return new Date(String(raw)).toISOString().split('T')[0];
  } catch {
    return null;
  }
}
