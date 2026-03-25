import { supabase } from '@/lib/supabase/client';
import { notifyCronFailure } from '@/lib/slack';

/**
 * Check pipeline health and alert on anomalies.
 * Call this at the end of check/ingest runs.
 */
export async function checkPipelineHealth(ingestedThisRun: number): Promise<void> {
  // Check total signals ingested in last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count: last24h } = await supabase
    .from('raw_signals')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo);

  const total24h = last24h || 0;

  if (total24h === 0 && ingestedThisRun === 0) {
    await notifyCronFailure(
      'pipeline-health',
      'Zero signals ingested in the last 24 hours. Check signal sources and Apify actors.'
    ).catch(console.error);
  }

  // Check for sources with consecutive failures
  const { data: sources } = await supabase
    .from('signal_sources')
    .select('name, last_signal_count, last_run_at')
    .eq('enabled', true);

  for (const source of sources || []) {
    if (source.last_signal_count === 0 && source.last_run_at) {
      const lastRun = new Date(source.last_run_at).getTime();
      const hoursSinceRun = (Date.now() - lastRun) / (1000 * 60 * 60);

      if (hoursSinceRun < 48) {
        // Source ran recently but got zero signals — might be fine, might be broken
        console.warn(`[health] Source '${source.name}' returned 0 signals on last run`);
      }
    }
  }
}
