import { supabase } from '@/lib/supabase/client';

const LOCK_DURATION_MS = 25 * 60 * 1000; // 25 minutes

/**
 * Attempt to acquire a cron lock atomically.
 * Uses a single UPDATE ... WHERE locked_until < now() to prevent race conditions.
 * If the row doesn't exist yet, inserts it.
 */
export async function acquireCronLock(jobName: string): Promise<boolean> {
  const lockExpiry = new Date(Date.now() + LOCK_DURATION_MS).toISOString();

  // Atomic: only updates if lock is expired or doesn't exist
  const { data, error } = await supabase.rpc('try_acquire_cron_lock', {
    p_job_name: jobName,
    p_locked_until: lockExpiry,
  });

  if (error) {
    console.error(`[cron-lock] Failed to acquire lock for ${jobName}:`, error);
    return false;
  }

  const acquired = data === true;
  if (!acquired) {
    console.log(`[cron-lock] ${jobName} is already running`);
  }
  return acquired;
}

export async function releaseCronLock(jobName: string): Promise<void> {
  await supabase
    .from('cron_locks')
    .update({ locked_until: new Date().toISOString() })
    .eq('job_name', jobName);
}
