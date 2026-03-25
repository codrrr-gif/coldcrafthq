// src/lib/signals/crunchbase-activity.ts
// Parses Crunchbase company data for recent activity signals.
// Detects: recent funding rounds, headcount changes, new investors,
// and company updates that indicate growth or transition.

import type { ApifyDatasetItem, ParsedSignal } from '@/lib/gtm/types';

export function parseCrunchbaseActivitySignals(items: ApifyDatasetItem[]): ParsedSignal[] {
  const signals: ParsedSignal[] = [];

  for (const item of items) {
    const name = String(item.name || item.company_name || item.organizationName || '');
    const domain = String(item.domain || item.website_url || item.homepage_url || '')
      .replace(/^https?:\/\/(www\.)?/, '')
      .split('/')[0]
      .toLowerCase();

    if (!name || !domain || domain.length < 4) continue;

    // Check for recent funding
    const lastFundingDate = item.last_funding_date || item.lastFundingAt || item.funded_at;
    const lastFundingAmount = item.last_funding_amount || item.lastFundingTotal || item.funding_total;
    const lastFundingType = String(item.last_funding_type || item.lastFundingRound || item.funding_round_type || '');
    const numEmployees = String(item.num_employees_enum || item.employeeCount || item.staffCount || '');

    // Signal 1: Recent funding (within last 30 days)
    if (lastFundingDate) {
      const fundingDate = new Date(String(lastFundingDate));
      const daysSinceFunding = Math.floor((Date.now() - fundingDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceFunding <= 30 && daysSinceFunding >= 0) {
        const amountStr = lastFundingAmount
          ? ` ($${formatAmount(Number(lastFundingAmount))})`
          : '';
        const roundStr = lastFundingType ? ` — ${lastFundingType}` : '';

        signals.push({
          signal_type: 'funding',
          company_name: name,
          company_domain: domain,
          headline: `${name} raised${amountStr}${roundStr} (via Crunchbase)`,
          signal_url: String(item.url || item.crunchbaseUrl || `https://www.crunchbase.com/organization/${name.toLowerCase().replace(/\s+/g, '-')}`),
          signal_date: fundingDate.toISOString().split('T')[0],
          raw_data: {
            ...item as Record<string, unknown>,
            source: 'crunchbase_activity',
          },
        });
        continue; // One signal per company per run
      }
    }

    // Signal 2: Growth indicator — company has recent updates and matches ICP headcount
    // Companies with 11-500 employees that recently updated their Crunchbase profile
    // are often preparing for fundraising, hiring, or product launches
    const updatedAt = item.updated_at || item.updatedAt;
    if (updatedAt) {
      const updateDate = new Date(String(updatedAt));
      const daysSinceUpdate = Math.floor((Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceUpdate <= 14 && isGrowthStage(numEmployees, lastFundingType)) {
        signals.push({
          signal_type: 'news',
          company_name: name,
          company_domain: domain,
          headline: `${name} (${numEmployees || 'unknown size'}${lastFundingType ? `, ${lastFundingType}` : ''}) — recently updated on Crunchbase`,
          signal_url: String(item.url || item.crunchbaseUrl || ''),
          signal_date: updateDate.toISOString().split('T')[0],
          raw_data: {
            ...item as Record<string, unknown>,
            source: 'crunchbase_activity',
          },
        });
      }
    }
  }

  return signals;
}

function isGrowthStage(numEmployees: string, fundingType: string): boolean {
  const growthEmployees = ['c_00011_00050', 'c_00051_00100', 'c_00101_00250', 'c_00251_00500',
    '11-50', '51-100', '51-200', '101-250', '201-500'];
  const growthFunding = ['seed', 'pre_seed', 'series_a', 'series_b', 'series_c',
    'Seed', 'Series A', 'Series B', 'Series C'];

  return growthEmployees.some(e => numEmployees.includes(e)) ||
    growthFunding.some(f => fundingType.toLowerCase().includes(f.toLowerCase()));
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return String(amount);
}
