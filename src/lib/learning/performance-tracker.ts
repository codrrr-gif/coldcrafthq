// src/lib/learning/performance-tracker.ts
// Pure read — builds full funnel metrics from existing tables.
// Used by the /api/learning/insights endpoint and insights dashboard.

import { supabase } from '@/lib/supabase/client';
import { SIGNAL_SCORES } from '@/lib/signals/types';
import type { FunnelMetrics } from '@/lib/gtm/types';

export async function getFunnelMetrics(): Promise<FunnelMetrics> {
  const [
    { count: signalsTotal },
    { count: pushed },
    { count: meeting },
    { count: won },
    repliedResult,
    interestedResult,
    signalBreakdown,
    topIndustries,
    topHeadcount,
    topFunding,
    openerPatterns,
    lastOptimized,
  ] = await Promise.all([
    supabase.from('raw_signals').select('*', { count: 'exact', head: true }),
    supabase.from('pipeline_leads').select('*', { count: 'exact', head: true }).eq('status', 'pushed'),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'meeting'),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'won'),

    supabase.from('touchpoints').select('*', { count: 'exact', head: true }).eq('status', 'replied'),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('classification', 'interested'),

    // Per-signal breakdown
    supabase
      .from('pipeline_leads')
      .select('signal_type')
      .eq('status', 'pushed')
      .not('signal_type', 'is', null),

    // Top industries by meeting count
    supabase
      .from('companies')
      .select('industry')
      .in('status', ['meeting', 'won'])
      .not('industry', 'is', null),

    // Top headcount ranges
    supabase
      .from('companies')
      .select('headcount_range')
      .in('status', ['meeting', 'won'])
      .not('headcount_range', 'is', null),

    // Top funding stages
    supabase
      .from('companies')
      .select('funding_stage')
      .in('status', ['meeting', 'won'])
      .not('funding_stage', 'is', null),

    supabase
      .from('opener_patterns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('learning_weights')
      .select('last_updated_at')
      .order('last_updated_at', { ascending: false })
      .limit(1),
  ]);

  const pushedN = pushed || 0;
  const repliedN = repliedResult.count || 0;
  const interestedN = interestedResult.count || 0;
  const meetingN = meeting || 0;

  // Build per-signal metrics
  const signalCounts: Record<string, number> = {};
  for (const row of signalBreakdown.data || []) {
    if (row.signal_type) signalCounts[row.signal_type] = (signalCounts[row.signal_type] || 0) + 1;
  }

  // Get learned scores for comparison
  const { data: learnedSignals } = await supabase
    .from('learning_weights')
    .select('dimension_value, learned_score, leads_interested')
    .eq('weight_type', 'signal');

  const learnedMap: Record<string, { score: number; interested: number }> = {};
  for (const row of learnedSignals || []) {
    learnedMap[row.dimension_value] = { score: row.learned_score, interested: row.leads_interested };
  }

  const bySignalType = Object.entries(signalCounts).map(([signal_type, pushedCount]) => {
    const learned = learnedMap[signal_type];
    const intCount = learned?.interested || 0;
    return {
      signal_type,
      pushed: pushedCount,
      interested: intCount,
      conversion_rate: pushedCount > 0 ? parseFloat((intCount / pushedCount).toFixed(4)) : 0,
      learned_score: learned?.score ?? null,
      default_score: SIGNAL_SCORES[signal_type as keyof typeof SIGNAL_SCORES] ?? 50,
    };
  }).sort((a, b) => b.pushed - a.pushed);

  // Aggregate industry/headcount/funding counts
  function toCounts(rows: Array<Record<string, string | null>>, key: string) {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const val = row[key];
      if (val) counts[val] = (counts[val] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ [key === 'industry' ? 'industry' : key === 'headcount_range' ? 'range' : 'stage']: value, meeting_count: count, win_rate: 0 }));
  }

  return {
    overall: {
      signals_total: signalsTotal || 0,
      pushed: pushedN,
      replied: repliedN,
      interested: interestedN,
      meeting: meetingN,
      won: won || 0,
      push_rate: 0,
      reply_rate: pushedN > 0 ? parseFloat((repliedN / pushedN).toFixed(4)) : 0,
      interest_rate: pushedN > 0 ? parseFloat((interestedN / pushedN).toFixed(4)) : 0,
      meeting_rate: pushedN > 0 ? parseFloat((meetingN / pushedN).toFixed(4)) : 0,
    },
    by_signal_type: bySignalType,
    top_industries: toCounts(topIndustries.data as Array<Record<string, string | null>> || [], 'industry') as FunnelMetrics['top_industries'],
    top_headcount: toCounts(topHeadcount.data as Array<Record<string, string | null>> || [], 'headcount_range') as FunnelMetrics['top_headcount'],
    top_funding: toCounts(topFunding.data as Array<Record<string, string | null>> || [], 'funding_stage') as FunnelMetrics['top_funding'],
    sample_openers: openerPatterns.data || [],
    last_optimized_at: lastOptimized.data?.[0]?.last_updated_at ?? null,
  };
}
