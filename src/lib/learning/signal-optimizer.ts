// src/lib/learning/signal-optimizer.ts
// Analyzes per-signal-type conversion rates and updates learning_weights.
// Minimum 10 leads pushed before adjusting. Score clamped 10-200.
// SCALE_FACTOR: 10% interest rate → score 150 (maps to default midpoint of 75).

import { supabase } from '@/lib/supabase/client';
import type { SignalType } from '@/lib/gtm/types';

const MIN_SAMPLES = 10;
const SCALE_FACTOR = 1500; // 10% conversion → 150

const SIGNAL_TYPES: SignalType[] = [
  'funding', 'leadership_change', 'competitor_review', 'intent',
  'job_change', 'job_posting', 'tech_stack', 'news',
];

export async function optimizeSignalWeights(): Promise<number> {
  let updated = 0;

  for (const signalType of SIGNAL_TYPES) {
    const { count: pushed } = await supabase
      .from('pipeline_leads')
      .select('*', { count: 'exact', head: true })
      .eq('signal_type', signalType)
      .eq('status', 'pushed');

    if ((pushed || 0) < MIN_SAMPLES) continue;

    // Count replied touchpoints for this signal type's leads
    const { data: leadIds } = await supabase
      .from('pipeline_leads')
      .select('id')
      .eq('signal_type', signalType)
      .eq('status', 'pushed');

    const ids = (leadIds || []).map((l) => l.id);

    const { count: replied } = await supabase
      .from('touchpoints')
      .select('*', { count: 'exact', head: true })
      .in('lead_id', ids)
      .eq('status', 'replied');

    const { count: interested } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .in('lead_id', ids)
      .eq('classification', 'interested');

    const pushedN = pushed || 0;
    const interestedN = interested || 0;
    const conversionRate = pushedN > 0 ? interestedN / pushedN : 0;
    const learnedScore = Math.max(10, Math.min(200, Math.round(conversionRate * SCALE_FACTOR)));

    const { error } = await supabase.from('learning_weights').upsert({
      weight_type: 'signal',
      dimension_value: signalType,
      learned_score: learnedScore,
      sample_count: pushedN,
      leads_pushed: pushedN,
      leads_replied: replied || 0,
      leads_interested: interestedN,
      conversion_rate: parseFloat(conversionRate.toFixed(4)),
      last_updated_at: new Date().toISOString(),
    }, { onConflict: 'weight_type,dimension_value' });

    if (error) {
      console.error(`[signal-optimizer] Failed to upsert ${signalType}:`, error);
    } else {
      updated++;
    }
  }

  return updated;
}
