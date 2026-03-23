// src/lib/signals/deduplicator.ts
import { supabase } from '@/lib/supabase/client';

// Check if we've processed this domain for this signal type recently (30-day window)
export async function hasRecentSignal(
  companyDomain: string,
  signalType: string,
  withinDays = 30,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('raw_signals')
    .select('id')
    .eq('company_domain', companyDomain)
    .eq('signal_type', signalType)
    .gte('created_at', cutoff)
    .limit(1)
    .maybeSingle();
  return !!data;
}
