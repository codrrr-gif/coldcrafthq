// src/lib/enrichment/contact-finder.ts
// ============================================
// Finds the best decision maker at a company.
// Uses Google search to find likely LinkedIn profiles
// for high-value titles, then extracts name + title.
// ============================================

import { runGoogleSearch, getRunStatus, getDatasetItems } from '@/lib/apify';
import { isTitleInIcp } from '@/lib/signals/icp-filter';

export interface Contact {
  first_name: string;
  last_name: string;
  title: string;
  linkedin_url: string | null;
  source: string;
}


export async function findDecisionMaker(
  companyName: string,
  companyDomain: string,
): Promise<Contact | null> {
  // Search Google for the decision maker at this company.
  // Include domain in the last query to narrow results for ambiguous company names.
  const queries = [
    `site:linkedin.com/in "${companyName}" "VP Sales"`,
    `site:linkedin.com/in "${companyName}" "Chief Revenue Officer" OR "Head of Sales"`,
    `site:linkedin.com/in "${companyName}" ${companyDomain} "VP Marketing" OR "Head of Growth"`,
  ];

  try {
    const { runId, datasetId } = await runGoogleSearch(queries, 3);

    // Poll for completion (max 30s)
    let items: Record<string, unknown>[] = [];
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const status = await getRunStatus(runId);
      if (status.status === 'SUCCEEDED') {
        items = await getDatasetItems(datasetId, 10) as Record<string, unknown>[];
        break;
      }
      if (status.status === 'FAILED') break;
    }

    for (const item of items) {
      const url = String(item.url || '');
      const title = String(item.title || '');

      if (!url.includes('linkedin.com/in/')) continue;
      if (!isTitleInIcp(title)) continue;

      const name = extractNameFromLinkedInTitle(title);
      if (!name) continue;

      return {
        first_name: name.firstName,
        last_name: name.lastName,
        title: extractTitleFromLinkedInTitle(title),
        linkedin_url: url,
        source: 'google_linkedin_search',
      };
    }
  } catch (err) {
    console.error('Contact finder error:', err);
  }

  return null;
}

function extractNameFromLinkedInTitle(title: string): { firstName: string; lastName: string } | null {
  // LinkedIn titles: "John Smith - VP Sales at Acme Corp | LinkedIn"
  const match = title.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\s*[-–|]/);
  if (!match) return null;
  return { firstName: match[1], lastName: match[2] };
}

function extractTitleFromLinkedInTitle(title: string): string {
  const match = title.match(/[-–]\s*([^|]+?)\s+at\s+/i);
  return match?.[1]?.trim() || 'Decision Maker';
}
