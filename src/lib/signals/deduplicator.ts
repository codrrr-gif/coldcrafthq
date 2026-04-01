// src/lib/signals/deduplicator.ts
import { supabase } from '@/lib/supabase/client';

// Check if we've processed this domain for this signal type recently (30-day window)
export async function hasRecentSignal(
  companyDomain: string,
  signalType: string | null,
  withinDays = 30,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from('raw_signals')
    .select('id')
    .eq('company_domain', companyDomain)
    .gte('signal_date', cutoff)
    .limit(1);

  // If signalType is null, check for ANY recent signal (cross-signal dedup)
  if (signalType) {
    query = query.eq('signal_type', signalType);
  }

  const { data } = await query.maybeSingle();
  return !!data;
}

// Check if this company already has a lead in the pipeline (any status except failed)
export async function hasActivePipelineLead(companyDomain: string): Promise<boolean> {
  const { data } = await supabase
    .from('pipeline_leads')
    .select('id')
    .eq('company_domain', companyDomain)
    .not('status', 'eq', 'failed')
    .limit(1)
    .maybeSingle();
  return !!data;
}
