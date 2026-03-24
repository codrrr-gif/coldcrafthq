// src/lib/learning/icp-learner.ts
// Analyzes companies that replied/met/won and extracts winning ICP patterns.
// Updates learning_weights for icp_industry, icp_headcount, icp_funding.
// Score = additive bonus (0-30) that replaces hardcoded +20/+15/+15 in company-scorer.

import { supabase } from '@/lib/supabase/client';

const MIN_SAMPLES = 10;

type Dimension = 'icp_industry' | 'icp_headcount' | 'icp_funding';

const DIMENSION_COLUMNS: Record<Dimension, string> = {
  icp_industry: 'industry',
  icp_headcount: 'headcount_range',
  icp_funding: 'funding_stage',
};

async function learnDimension(dimension: Dimension): Promise<number> {
  const col = DIMENSION_COLUMNS[dimension];
  let updated = 0;

  // Get distinct values that have been contacted
  const { data: contacted } = await supabase
    .from('companies')
    .select(col)
    .neq('status', 'discovered')
    .not(col, 'is', null);

  if (!contacted?.length) return 0;

  // Count occurrences per value
  const contactedCounts = contacted.reduce<Record<string, number>>((acc, row) => {
    const val = (row as unknown as Record<string, string>)[col];
    if (val) acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});

  const { data: winners } = await supabase
    .from('companies')
    .select(col)
    .in('status', ['replied', 'meeting', 'won'])
    .not(col, 'is', null);

  const winnerCounts = (winners || []).reduce<Record<string, number>>((acc, row) => {
    const val = (row as unknown as Record<string, string>)[col];
    if (val) acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});

  for (const [value, total] of Object.entries(contactedCounts)) {
    if (total < MIN_SAMPLES) continue;

    const wins = winnerCounts[value] || 0;
    const winRate = wins / total;
    // Map win rate to additive bonus: max 30 points (replaces hardcoded max)
    const learnedScore = Math.max(10, Math.min(30, Math.round(winRate * 500)));

    const { error } = await supabase.from('learning_weights').upsert({
      weight_type: dimension,
      dimension_value: value.toLowerCase(),
      learned_score: learnedScore,
      sample_count: total,
      leads_pushed: total,
      leads_replied: wins,
      leads_interested: wins,
      conversion_rate: parseFloat(winRate.toFixed(4)),
      last_updated_at: new Date().toISOString(),
    }, { onConflict: 'weight_type,dimension_value' });

    if (!error) updated++;
  }

  return updated;
}

export async function optimizeIcpWeights(): Promise<number> {
  const results = await Promise.all([
    learnDimension('icp_industry'),
    learnDimension('icp_headcount'),
    learnDimension('icp_funding'),
  ]);
  return results.reduce((a, b) => a + b, 0);
}
