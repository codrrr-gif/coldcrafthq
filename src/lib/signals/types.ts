// src/lib/signals/types.ts
import { supabase } from '@/lib/supabase/client';
import type { SignalType } from '@/lib/gtm/types';

export const SIGNAL_SCORES: Record<SignalType, number> = {
  funding: 100,
  leadership_change: 90,
  competitor_review: 85,
  intent: 80,
  job_change: 75,
  job_posting: 70,
  tech_stack: 65,
  news: 50,
};

// Dynamic version — reads learned score from DB, falls back to hardcoded default.
// Use this wherever signal scoring happens (ICP filter, scorer, pipeline ingest).
export async function getSignalScore(signalType: SignalType): Promise<number> {
  try {
    const { data } = await supabase
      .from('learning_weights')
      .select('learned_score')
      .eq('weight_type', 'signal')
      .eq('dimension_value', signalType)
      .maybeSingle();
    return data?.learned_score ?? SIGNAL_SCORES[signalType];
  } catch {
    return SIGNAL_SCORES[signalType];
  }
}

// ICP config from env vars with sensible defaults
export function getIcpConfig() {
  return {
    targetTitles: (
      process.env.ICP_TARGET_TITLES ||
      'CEO,Founder,Co-Founder,Owner,President,Managing Director,Partner,Managing Partner,Principal,General Manager,VP Sales,VP of Sales,Head of Sales,Chief Revenue Officer,CRO,VP Marketing,CMO,Head of Growth,Director of Sales,Director of Marketing,Director of Business Development,Head of Business Development,VP Business Development'
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
