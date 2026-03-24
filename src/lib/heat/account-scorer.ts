// src/lib/heat/account-scorer.ts
// Aggregates all signals for each known company into a heat score.
// Score = sum of signal scores with recency decay, capped at 300.
// Tier 1 = score >= 150, Tier 2 = 80-149, Tier 3 = below 80.

import { supabase } from '@/lib/supabase/client';

export async function recalculateHeatScores(): Promise<number> {
  const { data: companies } = await supabase
    .from('companies')
    .select('id, domain')
    .limit(500);

  if (!companies?.length) return 0;

  const now = Date.now();
  let updated = 0;

  for (const company of companies) {
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

    const { data: signals } = await supabase
      .from('raw_signals')
      .select('signal_type, signal_date, score, created_at')
      .eq('company_domain', company.domain)
      .gte('created_at', sixtyDaysAgo);

    if (!signals?.length) continue;

    const last7dCutoff = now - 7 * 24 * 60 * 60 * 1000;
    const last30dCutoff = now - 30 * 24 * 60 * 60 * 1000;

    const signals7d = signals.filter((s) => new Date(s.created_at).getTime() > last7dCutoff);
    const signals30d = signals.filter((s) => new Date(s.created_at).getTime() > last30dCutoff);

    // Compound score with recency decay
    const score = Math.min(
      signals.reduce((sum, s) => {
        const ageDays = (now - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24);
        const decay = ageDays <= 7 ? 1.0 : ageDays <= 30 ? 0.7 : 0.4;
        return sum + (s.score || 50) * decay;
      }, 0),
      300,
    );

    const sortedByDate = [...signals].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const latest = sortedByDate[0];

    await supabase.from('account_heat_scores').upsert({
      company_id: company.id,
      score: Math.round(score),
      tier: score >= 150 ? 1 : score >= 80 ? 2 : 3,
      signals_7d: signals7d.length,
      signals_30d: signals30d.length,
      last_signal_type: latest?.signal_type ?? null,
      last_signal_at: latest?.created_at ?? null,
      last_calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' });

    updated++;
  }

  return updated;
}
