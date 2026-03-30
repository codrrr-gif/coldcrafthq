// ============================================
// Bulk Verification Processor
// ============================================
// Called by the cron job. Picks up pending/processing jobs and
// processes emails in chunks to stay within Vercel's 60s timeout.

import { supabase } from '@/lib/supabase/client';
import { verifyEmail } from './pipeline';
import { clearMemoryCache } from './cache';
import type { VerificationResult } from './types';

const CHUNK_SIZE = 100; // Emails per invocation

/**
 * Fire a webhook callback when a job completes.
 * Requires the `callback_url` column on `verification_jobs` (TEXT, nullable).
 * Fire-and-forget — failures are logged but never retried.
 */
async function fireWebhookCallback(jobId: string): Promise<void> {
  const { data: job } = await supabase
    .from('verification_jobs')
    .select('callback_url, total_emails, processed, valid, invalid, risky, unknown')
    .eq('id', jobId)
    .single();

  if (!job?.callback_url) return;

  fetch(job.callback_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'verification_job.completed',
      job_id: jobId,
      total_emails: job.total_emails,
      processed: job.processed,
      valid: job.valid,
      invalid: job.invalid,
      risky: job.risky,
      unknown: job.unknown,
      completed_at: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(10000),
  }).catch(console.error);
}

export async function processVerificationJobs(): Promise<{
  processed: number;
  job_id: string | null;
}> {
  clearMemoryCache();

  // Find a job to process (pending first, then in-progress)
  const { data: job, error: jobError } = await supabase
    .from('verification_jobs')
    .select('id, total_emails, processed')
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (jobError || !job) {
    return { processed: 0, job_id: null };
  }

  // Mark as processing
  await supabase
    .from('verification_jobs')
    .update({ status: 'processing' })
    .eq('id', job.id);

  // Fetch next chunk of unprocessed results
  const { data: pending, error: fetchError } = await supabase
    .from('verification_results')
    .select('id, email')
    .eq('job_id', job.id)
    .eq('score', 0)
    .eq('verdict', 'unknown')
    .limit(CHUNK_SIZE);

  if (fetchError || !pending?.length) {
    // No more emails to process — mark as completed
    await supabase
      .from('verification_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    await fireWebhookCallback(job.id);

    return { processed: 0, job_id: job.id };
  }

  let processed = 0;
  const CONCURRENCY = 10;

  // Process in parallel batches of CONCURRENCY
  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (row) => {
        try {
          const result = await verifyEmail(row.email);
          await storeResult(row.id, job.id, result);
        } catch (err) {
          console.error(`Failed to verify ${row.email}:`, err);
          await supabase
            .from('verification_results')
            .update({
              verdict: 'unknown',
              risk_level: 'high',
              score: 1,
            })
            .eq('id', row.id);
        }
      })
    );
    processed += results.length;
  }

  // Update job counters
  await updateJobCounters(job.id);

  return { processed, job_id: job.id };
}

async function storeResult(
  resultId: string,
  jobId: string,
  result: VerificationResult
): Promise<void> {
  await supabase
    .from('verification_results')
    .update({
      verdict: result.verdict,
      risk_level: result.risk,
      score: result.score,
      reason: result.reason,
      recommendation: result.risk_analysis.recommendation,
      syntax_result: result.syntax,
      dns_result: result.dns,
      smtp_result: result.smtp,
      catch_all_result: result.catch_all,
      risk_analysis: result.risk_analysis,
      ai_analysis: result.ai_analysis,
      suggested_correction: result.suggested_correction,
      verification_time_ms: result.verification_time_ms,
    })
    .eq('id', resultId);
}

async function updateJobCounters(jobId: string): Promise<void> {
  // Use exact counts instead of fetching all rows (Supabase caps at 1000)
  const countByVerdict = async (verdict: string) => {
    const { count } = await supabase
      .from('verification_results')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .eq('verdict', verdict);
    return count ?? 0;
  };

  const [valid, invalid, risky, totalCount] = await Promise.all([
    countByVerdict('valid'),
    countByVerdict('invalid'),
    countByVerdict('risky'),
    supabase
      .from('verification_results')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .then(({ count }) => count ?? 0),
  ]);

  // Processed = anything that's no longer in initial state (score 0 + unknown)
  const { count: unprocessedCount } = await supabase
    .from('verification_results')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('verdict', 'unknown')
    .eq('score', 0);

  const processed = totalCount - (unprocessedCount ?? 0);
  const unknown = processed - valid - invalid - risky;
  const isComplete = processed >= totalCount;

  await supabase
    .from('verification_jobs')
    .update({
      processed,
      valid,
      invalid,
      risky,
      unknown: Math.max(0, unknown),
      ...(isComplete ? {
        status: 'completed',
        completed_at: new Date().toISOString(),
      } : {}),
    })
    .eq('id', jobId);

  if (isComplete) {
    await fireWebhookCallback(jobId);
  }
}
