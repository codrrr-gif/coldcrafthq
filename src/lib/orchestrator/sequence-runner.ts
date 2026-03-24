// src/lib/orchestrator/sequence-runner.ts
// ============================================
// Multi-channel sequence orchestrator.
// Runs on every cron tick (daily) and handles:
//   D1  — LinkedIn connection request (newly pushed leads)
//   D5  — LinkedIn DM + Vapi voice follow-up
//   Champions — detect job changes in watchlist
//   Heat — recalculate account heat scores
// ============================================

import { supabase } from '@/lib/supabase/client';
import { sendLinkedInConnect, sendFollowUpDM } from '@/lib/linkedin/connection-sender';
import { scheduleFollowUpCalls } from '@/lib/voice/call-scheduler';
import { detectJobChanges } from '@/lib/champions/job-change-detector';
import { recalculateHeatScores } from '@/lib/heat/account-scorer';

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

        const sent = await sendLinkedInConnect(lead).catch((err) => {
          console.error(`[orchestrator] LinkedIn connect failed for ${lead.id}:`, err);
          return false;
        });
        if (sent) result.linkedin_connects++;
      }
    }

    // D5: LinkedIn DM for leads pushed 4-5 days ago
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();

    const { data: d5Leads } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('status', 'pushed')
      .lt('pushed_at', fiveDaysAgo)
      .gte('pushed_at', fourDaysAgo)
      .not('linkedin_url', 'is', null)
      .limit(20);

    if (d5Leads?.length) {
      for (const lead of d5Leads) {
        // Skip if already sent a DM
        const { count } = await supabase
          .from('touchpoints')
          .select('*', { count: 'exact', head: true })
          .eq('lead_id', lead.id)
          .eq('touch_type', 'linkedin_dm');

        if ((count || 0) > 0) continue;

        const sent = await sendFollowUpDM(lead).catch((err) => {
          console.error(`[orchestrator] LinkedIn DM failed for ${lead.id}:`, err);
          return false;
        });
        if (sent) result.linkedin_dms++;
      }
    }
  }

  // D5: Voice follow-up (handled by call-scheduler, already has its own window logic)
  result.voice_calls = await scheduleFollowUpCalls().catch((err) => {
    console.error('[orchestrator] Voice scheduling failed:', err);
    return 0;
  });

  return result;
}
