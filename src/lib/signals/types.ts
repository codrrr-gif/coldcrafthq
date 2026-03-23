// src/lib/signals/types.ts
import type { SignalType } from '@/lib/gtm/types';

export const SIGNAL_SCORES: Record<SignalType, number> = {
  funding: 100,
  leadership_change: 90,
  job_posting: 70,
  news: 50,
};

// ICP config from env vars with sensible defaults
export function getIcpConfig() {
  return {
    targetTitles: (
      process.env.ICP_TARGET_TITLES ||
      'CEO,Founder,Co-Founder,VP Sales,VP of Sales,Head of Sales,Chief Revenue Officer,CRO,VP Marketing,CMO,Head of Growth,Director of Sales,Head of Business Development,VP Business Development'
    ).split(',').map((t) => t.trim().toLowerCase()),

    excludeIndustries: (
      process.env.ICP_EXCLUDE_INDUSTRIES ||
      'government,non-profit,nonprofit,education,hospital,healthcare,military'
    ).split(',').map((i) => i.trim().toLowerCase()),

    targetGeographies: (
      process.env.ICP_GEOGRAPHIES ||
      'US,USA,United States,UK,United Kingdom,Canada,Australia,CA,AU,GB'
    ).split(',').map((g) => g.trim()),

    minFundingAmountM: parseFloat(process.env.ICP_MIN_FUNDING_M || '0.5'),
    maxFundingAmountM: parseFloat(process.env.ICP_MAX_FUNDING_M || '100'),
  };
}
