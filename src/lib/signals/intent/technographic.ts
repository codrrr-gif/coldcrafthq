// src/lib/signals/intent/technographic.ts
// Detects companies using competitor tools via job postings.
// "Must know Salesforce" in a sales job posting = they use Salesforce.
// This is a strong intent signal — they may be looking to switch or augment.

import { runLinkedInJobsSearch, getRunStatus, getDatasetItems } from '@/lib/apify';
import type { ParsedSignal } from '@/lib/gtm/types';

export async function detectTechStackSignals(): Promise<ParsedSignal[]> {
  const tools = (
    process.env.COMPETITOR_TOOLS || 'Salesforce,HubSpot,Outreach,Salesloft,Apollo'
  ).split(',').map((t) => t.trim()).filter(Boolean);

  if (!tools.length) return [];

  try {
    const queries = tools.map((tool) =>
      `"${tool}" (VP Sales OR "Head of Sales" OR "Revenue Operations" OR "Sales Operations")`
    );

    const { runId, datasetId } = await runLinkedInJobsSearch(queries, 'United States', 100);

    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const status = await getRunStatus(runId);
      if (status.status === 'SUCCEEDED') {
        const items = await getDatasetItems(datasetId, 100);
        const signals: ParsedSignal[] = [];

        for (const item of items) {
          const desc = String(item.description || item.jobDescription || '').toLowerCase();
          const matchedTool = tools.find((t) => desc.includes(t.toLowerCase()));
          if (!matchedTool) continue;

          const companyName = String(item.companyName || '');
          if (!companyName) continue;

          // Derive domain from LinkedIn company URL or company name
          const liUrl = String(item.companyUrl || '');
          const slug = liUrl.replace(/.*linkedin\.com\/company\//, '').replace(/\/$/, '');
          const domain = slug ? `${slug}.com` : null;

          signals.push({
            signal_type: 'tech_stack',
            company_name: companyName,
            company_domain: domain,
            headline: `${companyName} hiring with ${matchedTool} — potential switch/augment signal`,
            signal_url: String(item.jobUrl || item.url || ''),
            signal_date: new Date().toISOString().split('T')[0],
            raw_data: item as Record<string, unknown>,
          });
        }
        return signals;
      }
      if (['FAILED', 'TIMED-OUT', 'ABORTED'].includes(status.status)) break;
    }
  } catch (err) {
    console.error('[technographic] Detection failed:', err);
  }
  return [];
}
