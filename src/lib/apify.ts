// src/lib/apify.ts
// ============================================
// Apify API Client
// ============================================

import type { ApifyRunResult, ApifyDatasetItem } from '@/lib/gtm/types';

const APIFY_BASE = 'https://api.apify.com/v2';

function getApiKey(): string {
  const key = process.env.APIFY_API_KEY;
  if (!key) throw new Error('APIFY_API_KEY not set');
  return key;
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
  };
}

// Start an actor run with given input
export async function runActor(
  actorId: string,
  input: Record<string, unknown>,
): Promise<{ runId: string; datasetId: string }> {
  const res = await fetch(`${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify runActor failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    runId: data.data.id,
    datasetId: data.data.defaultDatasetId,
  };
}

// Get run status
export async function getRunStatus(runId: string): Promise<ApifyRunResult> {
  const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify getRunStatus failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.data as ApifyRunResult;
}

// Fetch all items from a dataset
export async function getDatasetItems(
  datasetId: string,
  limit = 200,
): Promise<ApifyDatasetItem[]> {
  const url = `${APIFY_BASE}/datasets/${datasetId}/items?limit=${limit}&clean=true`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify getDatasetItems failed: ${res.status} ${text}`);
  }

  return res.json();
}

// Run actor for Google Search Scraper (specific input format)
export async function runGoogleSearch(
  queries: string[],
  resultsPerQuery = 10,
): Promise<{ runId: string; datasetId: string }> {
  return runActor('apify/google-search-scraper', {
    queries: queries.join('\n'),
    maxPagesPerQuery: 1,
    resultsPerPage: resultsPerQuery,
    mobileResults: false,
    languageCode: 'en',
    countryCode: 'us',
    includeUnfilteredResults: false,
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  });
}

// Run actor for LinkedIn Jobs Scraper
export async function runLinkedInJobsSearch(
  keywords: string[],
  location = 'United States',
  limit = 50,
): Promise<{ runId: string; datasetId: string }> {
  return runActor('bebity/linkedin-jobs-scraper', {
    title: keywords.join(' OR '),
    location,
    rows: limit,
    publishedAt: 'r86400', // last 24 hours
  });
}

// Run actor for Crunchbase activity tracking
export async function runCrunchbaseActivity(
  keywords: string[],
  limit = 200,
): Promise<{ runId: string; datasetId: string }> {
  const query = keywords.join('+');
  return runActor('pratikdani/crunchbase-companies-scraper', {
    url: `https://www.crunchbase.com/discover/organization.companies?query=${encodeURIComponent(query)}`,
    maxItems: limit,
  });
}

// Run actor for Product Hunt Scraper
export async function runProductHuntSearch(
  limit = 50,
): Promise<{ runId: string; datasetId: string }> {
  return runActor('maximedupre/product-hunt-scraper', {
    startUrls: [
      { url: 'https://www.producthunt.com/topics/saas' },
      { url: 'https://www.producthunt.com/topics/developer-tools' },
      { url: 'https://www.producthunt.com/topics/productivity' },
    ],
    maxItems: limit,
    sortBy: 'NEWEST',
  });
}

// Run actor for Twitter/X Search Scraper
export async function runTwitterSearch(
  queries: string[],
  limit = 100,
): Promise<{ runId: string; datasetId: string }> {
  return runActor('apidojo/tweet-scraper', {
    searchTerms: queries,
    maxTweets: limit,
    sort: 'Latest',
    tweetLanguage: 'en',
  });
}

// Run actor for LinkedIn People Search (contact finding)
// Uses search URL format to find decision makers at a specific company.
export async function runLinkedInPeopleSearch(
  companyName: string,
  titleKeywords: string[],
  limit = 10,
): Promise<{ runId: string; datasetId: string }> {
  // Build LinkedIn search URL with company and title filters
  const titleQuery = titleKeywords.map((t) => `"${t}"`).join(' OR ');
  const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${companyName} ${titleQuery}`)}&origin=GLOBAL_SEARCH_HEADER`;

  return runActor('anchor/linkedin-people-search', {
    startUrls: [{ url: searchUrl }],
    maxItems: limit,
  });
}
