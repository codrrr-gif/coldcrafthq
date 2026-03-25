// src/lib/signals/twitter.ts
// Parses Twitter/X scraper results for hiring, funding, and growth signals.
// Twitter is noisy — aggressive filtering required.

import type { ApifyDatasetItem, ParsedSignal } from '@/lib/gtm/types';
import { extractDomainFromText, extractDateFromItem } from './utils';

// Signal patterns — tweet must match at least one
const HIRING_PATTERNS = [
  'we\'re hiring', 'we are hiring', 'join our team', 'now hiring',
  'hiring a', 'looking for a', 'come work with us', 'open role',
  'job opening', 'growing our team', 'expanding the team',
];

const FUNDING_PATTERNS = [
  'raised', 'funding', 'series a', 'series b', 'series c',
  'seed round', 'just closed', 'excited to announce', 'backed by',
  'led by', 'investors', 'round of', 'million in',
];

const GROWTH_PATTERNS = [
  'just hit', 'milestone', 'crossed', 'revenue', 'arr',
  'customers', 'users', '10x', '100%', 'doubled', 'tripled',
  'fastest growing', 'inc 5000', 'hypergrowth',
];

// Noise filters — skip these tweets
const NOISE_PATTERNS = [
  'rt @', 'retweet', 'giveaway', 'win a', 'free trial',
  'click here', 'sign up now', 'limited time', 'discount code',
  'follow and', 'like and', '#ad', 'sponsored',
];

// Minimum followers to filter out noise accounts
const MIN_FOLLOWERS = 500;

export function parseTwitterSignals(items: ApifyDatasetItem[]): ParsedSignal[] {
  const signals: ParsedSignal[] = [];
  const seenDomains = new Set<string>();

  for (const item of items) {
    const author = (item.author || {}) as Record<string, unknown>;
    const user = (item.user || {}) as Record<string, unknown>;
    const entities = (item.entities || {}) as Record<string, unknown>;

    const text = String(item.text || item.full_text || item.tweet || '').toLowerCase();
    const authorName = String(author.name || user.name || item.username || '');
    const authorFollowers = Number(author.followers || user.followers_count || 0);

    // Skip low-follower accounts (noise)
    if (authorFollowers < MIN_FOLLOWERS) continue;

    // Skip noise
    if (NOISE_PATTERNS.some((p) => text.includes(p))) continue;

    // Determine signal type from content
    let signalType: 'funding' | 'job_posting' | 'news' | null = null;
    if (FUNDING_PATTERNS.some((p) => text.includes(p))) signalType = 'funding';
    else if (HIRING_PATTERNS.some((p) => text.includes(p))) signalType = 'job_posting';
    else if (GROWTH_PATTERNS.some((p) => text.includes(p))) signalType = 'news';

    if (!signalType) continue;

    // Extract domain from tweet URLs or author bio
    const entitiesUrls = Array.isArray(entities.urls) ? entities.urls.map((u: { expanded_url?: string }) => u.expanded_url).join(' ') : '';
    const urls = String(item.urls || entitiesUrls || '');
    const authorBio = String(author.description || user.description || '');
    const domain = extractDomainFromText(urls) || extractDomainFromText(authorBio);

    // Skip if no domain — can't enrich without it
    if (!domain) continue;

    // Deduplicate within same batch (same domain, same signal type)
    const dedupeKey = `${domain}:${signalType}`;
    if (seenDomains.has(dedupeKey)) continue;
    seenDomains.add(dedupeKey);

    // Truncate tweet for headline
    const originalText = String(item.text || item.full_text || item.tweet || '');
    const headline = `@${authorName}: ${originalText.slice(0, 120)}${originalText.length > 120 ? '...' : ''}`;

    signals.push({
      signal_type: signalType,
      company_name: authorName,
      company_domain: domain,
      headline,
      signal_url: String(item.url || item.tweet_url || `https://x.com/${author.username || user.screen_name}/status/${item.id}` || ''),
      signal_date: extractDateFromItem(item as Record<string, unknown>) || new Date().toISOString().split('T')[0],
      raw_data: {
        ...item as Record<string, unknown>,
        source: 'twitter',
        author_followers: authorFollowers,
      },
    });
  }

  return signals;
}
