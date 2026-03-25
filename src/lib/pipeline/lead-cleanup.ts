import { supabase } from '@/lib/supabase/client';

const STALE_THRESHOLD_MINUTES = 15;
const MAX_RETRIES = 3;

/**
 * Reset leads stuck in intermediate states back to pending for retry.
 * Leads that have exceeded max retries are marked as failed.
 */
export async function cleanupStalePipelineLeads(): Promise<{ reset: number; failed: number }> {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString();

  // Find leads stuck in intermediate states
  const { data: staleLeads } = await supabase
    .from('pipeline_leads')
    .select('id, status, retry_count')
    .in('status', ['finding_contact', 'finding_email', 'verifying', 'researching'])
    .lt('updated_at', cutoff);

  if (!staleLeads?.length) return { reset: 0, failed: 0 };

  let reset = 0;
  let failed = 0;

  for (const lead of staleLeads) {
    const retryCount = (lead.retry_count || 0) + 1;

    if (retryCount > MAX_RETRIES) {
      await supabase
        .from('pipeline_leads')
        .update({
          status: 'failed',
          failure_reason: `exceeded_max_retries_in_${lead.status}`,
          retry_count: retryCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);
      failed++;
    } else {
      await supabase
        .from('pipeline_leads')
        .update({
          status: 'pending',
          retry_count: retryCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);
      reset++;
      console.log(`[lead-cleanup] Reset lead ${lead.id} from ${lead.status} (retry ${retryCount}/${MAX_RETRIES})`);
    }
  }

  return { reset, failed };
}
