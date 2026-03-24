// src/lib/tam/company-discovery.ts
import { runActor, getRunStatus, getDatasetItems } from '@/lib/apify';
import { supabase } from '@/lib/supabase/client';
import { scoreCompany } from './company-scorer';

interface DiscoveredCompany {
  domain: string;
  name: string;
  industry?: string;
  headcount_range?: string;
  funding_stage?: string;
  location?: string;
  source: string;
}

export async function discoverFromCrunchbase(
  keywords: string[],
  limit = 100,
): Promise<DiscoveredCompany[]> {
  try {
    const { runId, datasetId } = await runActor('curious_coder/crunchbase-companies-scraper', {
      queries: keywords,
      maxResults: limit,
      includePublicCompanies: false,
    });

    for (let i = 0; i < 36; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const status = await getRunStatus(runId);
      if (status.status === 'SUCCEEDED') {
        const items = await getDatasetItems(datasetId, limit);
        return items.map((item) => ({
          domain: extractDomain(String(item.website || item.homepage_url || '')),
          name: String(item.name || item.organization_name || ''),
          industry: String(item.category_list || item.industry || ''),
          headcount_range: mapHeadcount(String(item.num_employees_enum || '')),
          funding_stage: String(item.last_funding_type || '').toLowerCase().replace(/ /g, '_'),
          location: String(item.country_code || item.headquarters || ''),
          source: 'crunchbase',
        })).filter((c) => c.domain && c.name);
      }
      if (['FAILED', 'TIMED-OUT', 'ABORTED'].includes(status.status)) break;
    }
  } catch (err) {
    console.error('[company-discovery] Crunchbase scrape failed:', err);
  }
  return [];
}

export async function discoverFromLinkedIn(
  keywords: string[],
  limit = 100,
): Promise<DiscoveredCompany[]> {
  try {
    const { runId, datasetId } = await runActor('gbdev/linkedin-company-scraper', {
      searchKeywords: keywords.join(' OR '),
      maxResults: limit,
    });

    for (let i = 0; i < 36; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const status = await getRunStatus(runId);
      if (status.status === 'SUCCEEDED') {
        const items = await getDatasetItems(datasetId, limit);
        return items.map((item) => ({
          domain: extractDomain(String(item.website || '')),
          name: String(item.name || ''),
          industry: String(item.industry || ''),
          headcount_range: normalizeHeadcount(String(item.staffCount || '')),
          location: String(item.headquarterCountry || ''),
          source: 'linkedin',
        })).filter((c) => c.domain && c.name);
      }
      if (['FAILED', 'TIMED-OUT', 'ABORTED'].includes(status.status)) break;
    }
  } catch (err) {
    console.error('[company-discovery] LinkedIn scrape failed:', err);
  }
  return [];
}

export async function upsertCompanies(companies: DiscoveredCompany[]): Promise<number> {
  let inserted = 0;
  for (const c of companies) {
    if (!c.domain || c.domain.length < 4) continue;
    const score = scoreCompany(c);
    const tier: 1 | 2 | 3 = score >= 75 ? 1 : score >= 50 ? 2 : 3;

    const { error } = await supabase.from('companies').upsert({
      domain: c.domain,
      name: c.name || null,
      industry: c.industry || null,
      headcount_range: c.headcount_range || null,
      funding_stage: c.funding_stage || null,
      location: c.location || null,
      tam_score: score,
      tier,
      source: c.source,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'domain', ignoreDuplicates: false });

    if (!error) inserted++;
  }
  return inserted;
}

function extractDomain(url: string): string {
  if (!url) return '';
  try {
    const cleaned = url.startsWith('http') ? url : `https://${url}`;
    return new URL(cleaned).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function mapHeadcount(raw: string): string {
  if (!raw) return '';
  if (raw.includes('1_10') || raw.includes('1-10') || raw.includes('c_1')) return '1-10';
  if (raw.includes('11_50') || raw.includes('11-50') || raw.includes('c_11')) return '11-50';
  if (raw.includes('51_200') || raw.includes('51-200') || raw.includes('c_51')) return '51-200';
  if (raw.includes('201_500') || raw.includes('201-500') || raw.includes('c_201')) return '201-500';
  if (raw.includes('501') || raw.includes('1000') || raw.includes('c_501')) return '500+';
  return raw;
}

function normalizeHeadcount(count: string): string {
  const n = parseInt(count, 10);
  if (isNaN(n)) return '';
  if (n <= 10) return '1-10';
  if (n <= 50) return '11-50';
  if (n <= 200) return '51-200';
  if (n <= 500) return '201-500';
  return '500+';
}
