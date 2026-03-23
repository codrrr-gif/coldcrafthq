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
    countryCode: 'US',
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
