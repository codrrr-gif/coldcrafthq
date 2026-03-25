// src/lib/orchestrator/sequence-runner.ts
// ============================================
// Multi-channel sequence orchestrator.
// Runs on every cron tick (daily) and handles:
//   D1  — LinkedIn connection request (newly pushed leads)
//   D(n) — LinkedIn DM + Vapi voice (data-driven timing from timing-optimizer)
//   Champions — detect job changes in watchlist
//   Heat — recalculate account heat scores
// ============================================

import { supabase } from '@/lib/supabase/client';
import { sendLinkedInConnect, sendFollowUpDM } from '@/lib/linkedin/connection-sender';
import { scheduleFollowUpCalls } from '@/lib/voice/call-scheduler';
import { detectJobChanges } from '@/lib/champions/job-change-detector';
import { recalculateHeatScores } from '@/lib/heat/account-scorer';
import { getOptimalDelays } from './timing-optimizer';
import { isLeadSuppressed } from './lead-suppression';

export interface SequenceResult {
  linkedin_connects: number;
  linkedin_dms: number;
  voice_calls: number;
  job_changes: number;
  heat_scores_updated: number;
}

export async function runDailySequence(): Promise<SequenceResult> {
  const result: SequenceResult = {
    linkedin_connects: 0,
    linkedin_dms: 0,
    voice_calls: 0,
    job_changes: 0,
    heat_scores_updated: 0,
  };

  // Fetch data-driven delays (falls back to D5/D5 defaults on error)
  const delays = await getOptimalDelays().catch(() => ({ dmDelay: 5, voiceDelay: 5 }));
  console.log('[orchestrator] Using delays: DM day', delays.dmDelay, 'Voice day', delays.voiceDelay);

  // Ensure voice fires at least 1 day after DM to prevent same-day pile-up
  if (delays.voiceDelay <= delays.dmDelay) {
    delays.voiceDelay = delays.dmDelay + 1;
  }

  // Run heat scores + champion check in parallel (no side effects on leads)
  const [heatUpdated, jobChanges] = await Promise.all([
    recalculateHeatScores().catch((err) => {
      console.error('[orchestrator] Heat recalc failed:', err);
      return 0;
    }),
    detectJobChanges().catch((err) => {
      console.error('[orchestrator] Champion check failed:', err);
      return 0;
    }),
  ]);

  result.heat_scores_updated = heatUpdated;
  result.job_changes = jobChanges;

  // D1: LinkedIn connection for leads pushed in the last 24 hours
  if (process.env.HEYREACH_API_KEY) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: newLeads } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('status', 'pushed')
      .gte('pushed_at', oneDayAgo)
      .not('linkedin_url', 'is', null)
      .limit(20);

    if (newLeads?.length) {
      for (const lead of newLeads) {
        // Skip if already sent a connect touchpoint
        const { count } = await supabase
          .from('touchpoints')
          .select('*', { count: 'exact', head: true })
          .eq('lead_id', lead.id)
          .eq('touch_type', 'linkedin_connect');

        if ((count || 0) > 0) continue;
        if (await isLeadSuppressed(lead.id)) continue;

        const sent = await sendLinkedInConnect(lead).catch((err) => {
          console.error(`[orchestrator] LinkedIn connect failed for ${lead.id}:`, err);
          return false;
        });
        if (sent) result.linkedin_connects++;
      }
    }

    // LinkedIn DM: data-driven delay (was hardcoded D5)
    const dmWindowEndMs = delays.dmDelay * 24 * 60 * 60 * 1000;
    const dmWindowStartMs = (delays.dmDelay - 1) * 24 * 60 * 60 * 1000;
    const dmWindowEnd = new Date(Date.now() - dmWindowEndMs).toISOString();
    const dmWindowStart = new Date(Date.now() - dmWindowStartMs).toISOString();

    const { data: dmLeads } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('status', 'pushed')
      .gte('pushed_at', dmWindowEnd)
      .lt('pushed_at', dmWindowStart)
      .not('linkedin_url', 'is', null)
      .limit(20);

    if (dmLeads?.length) {
      for (const lead of dmLeads) {
        // Skip if already sent a DM
        const { count } = await supabase
          .from('touchpoints')
          .select('*', { count: 'exact', head: true })
          .eq('lead_id', lead.id)
          .eq('touch_type', 'linkedin_dm');

        if ((count || 0) > 0) continue;
        if (await isLeadSuppressed(lead.id)) continue;

        const sent = await sendFollowUpDM(lead).catch((err) => {
          console.error(`[orchestrator] LinkedIn DM failed for ${lead.id}:`, err);
          return false;
        });
        if (sent) result.linkedin_dms++;
      }
    }
  }

  // Voice follow-up: pass data-driven delay to call-scheduler
  result.voice_calls = await scheduleFollowUpCalls(delays.voiceDelay).catch((err) => {
    console.error('[orchestrator] Voice scheduling failed:', err);
    return 0;
  });

  return result;
}
