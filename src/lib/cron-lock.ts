import { supabase } from '@/lib/supabase/client';

const LOCK_DURATION_MS = 25 * 60 * 1000; // 25 minutes

/**
 * Attempt to acquire a cron lock. Returns true if lock acquired, false if another run is active.
 * Uses upsert with a timestamp check to prevent concurrent runs.
 */
export async function acquireCronLock(jobName: string): Promise<boolean> {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() + LOCK_DURATION_MS);

  // Try to claim: only succeed if no active lock exists
  const { data } = await supabase
    .from('cron_locks')
    .select('locked_until')
    .eq('job_name', jobName)
    .single();

  if (data && new Date(data.locked_until) > now) {
    console.log(`[cron-lock] ${jobName} is already running (locked until ${data.locked_until})`);
    return false;
  }

  const { error } = await supabase
    .from('cron_locks')
    .upsert({
      job_name: jobName,
      locked_at: now.toISOString(),
      locked_until: lockExpiry.toISOString(),
    }, { onConflict: 'job_name' });

  if (error) {
    console.error(`[cron-lock] Failed to acquire lock for ${jobName}:`, error);
    return false;
  }

  return true;
}

export async function releaseCronLock(jobName: string): Promise<void> {
  await supabase
    .from('cron_locks')
    .update({ locked_until: new Date().toISOString() })
    .eq('job_name', jobName);
}
