// src/lib/orchestrator/timing-optimizer.ts
// ============================================
// Data-driven multi-channel sequence timing.
// Replaces hardcoded D1/D5 delays with optimal
// delays derived from actual reply patterns.
// ============================================

import { supabase } from '@/lib/supabase/client';

interface ChannelDelays {
  dmDelay: number;   // days after push to send LinkedIn DM
  voiceDelay: number; // days after push to schedule voice call
}

const DEFAULT_DELAYS: ChannelDelays = { dmDelay: 5, voiceDelay: 5 };
const MIN_SAMPLES = 20;

/**
 * Compute the median of a sorted numeric array.
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Map median reply time (in days) to optimal DM and voice delays.
 *
 * - Fast responders (< 3 days): email is working, delay DM/voice further out
 * - Medium responders (3-5 days): roughly current cadence
 * - Slow responders (> 5 days): reach via other channels sooner
 */
function delaysFromMedianReplyDays(medianDays: number): ChannelDelays {
  if (medianDays < 3) {
    return { dmDelay: 4, voiceDelay: 6 };
  }
  if (medianDays <= 5) {
    return { dmDelay: 5, voiceDelay: 7 };
  }
  // > 5 days — slow responders, accelerate alternate channels
  return { dmDelay: 3, voiceDelay: 5 };
}

/**
 * Query touchpoints + conversations for reply timing data and return
 * optimal DM / voice delays in days.
 *
 * Falls back to DEFAULT_DELAYS when fewer than MIN_SAMPLES replies exist.
 */
export async function getOptimalDelays(): Promise<ChannelDelays> {
  // 1. Touchpoint-based: time between email_sent and first reply
  const { data: touchpoints } = await supabase
    .from('touchpoints')
    .select('lead_id, touch_type, sent_at, replied_at')
    .eq('touch_type', 'email_sent')
    .not('replied_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(500);

  const replyDelaysDays: number[] = [];

  if (touchpoints?.length) {
    for (const tp of touchpoints) {
      if (tp.sent_at && tp.replied_at) {
        const sentMs = new Date(tp.sent_at).getTime();
        const repliedMs = new Date(tp.replied_at).getTime();
        const diffDays = (repliedMs - sentMs) / (1000 * 60 * 60 * 24);
        if (diffDays > 0 && diffDays < 30) {
          replyDelaysDays.push(diffDays);
        }
      }
    }
  }

  // 2. Conversation-based: interested / meeting_booked relative to lead push
  const { data: convos } = await supabase
    .from('conversations')
    .select('lead_id, classification, created_at')
    .in('classification', ['interested', 'meeting_booked'])
    .order('created_at', { ascending: false })
    .limit(500);

  if (convos?.length) {
    // Batch-fetch pushed_at for those leads
    const leadIds = [...new Set(convos.map((c) => c.lead_id).filter(Boolean))];

    if (leadIds.length) {
      const { data: leads } = await supabase
        .from('pipeline_leads')
        .select('id, pushed_at')
        .in('id', leadIds);

      const pushedAtMap = new Map(
        (leads || []).map((l) => [l.id, l.pushed_at as string | null])
      );

      for (const convo of convos) {
        const pushedAt = pushedAtMap.get(convo.lead_id);
        if (pushedAt && convo.created_at) {
          const pushMs = new Date(pushedAt).getTime();
          const replyMs = new Date(convo.created_at).getTime();
          const diffDays = (replyMs - pushMs) / (1000 * 60 * 60 * 24);
          if (diffDays > 0 && diffDays < 30) {
            replyDelaysDays.push(diffDays);
          }
        }
      }
    }
  }

  // Not enough data — use defaults
  if (replyDelaysDays.length < MIN_SAMPLES) {
    console.log(
      `[timing-optimizer] Only ${replyDelaysDays.length} reply samples (need ${MIN_SAMPLES}), using defaults`
    );
    return DEFAULT_DELAYS;
  }

  const med = median(replyDelaysDays);
  const delays = delaysFromMedianReplyDays(med);

  console.log(
    `[timing-optimizer] Median reply time: ${med.toFixed(1)}d across ${replyDelaysDays.length} samples → DM day ${delays.dmDelay}, Voice day ${delays.voiceDelay}`
  );

  return delays;
}

/**
 * Per-signal-type override. Returns optimal delays for a specific signal type,
 * or null if there is insufficient data for that signal type.
 */
export async function getSignalTypeDelays(
  signalType: string
): Promise<ChannelDelays | null> {
  // Touchpoints joined through pipeline_leads for the given signal_type
  const { data: leads } = await supabase
    .from('pipeline_leads')
    .select('id')
    .eq('signal_type', signalType);

  if (!leads?.length) return null;

  const leadIds = leads.map((l) => l.id);

  const { data: touchpoints } = await supabase
    .from('touchpoints')
    .select('lead_id, sent_at, replied_at')
    .eq('touch_type', 'email_sent')
    .not('replied_at', 'is', null)
    .in('lead_id', leadIds)
    .limit(500);

  const replyDelaysDays: number[] = [];

  if (touchpoints?.length) {
    for (const tp of touchpoints) {
      if (tp.sent_at && tp.replied_at) {
        const sentMs = new Date(tp.sent_at).getTime();
        const repliedMs = new Date(tp.replied_at).getTime();
        const diffDays = (repliedMs - sentMs) / (1000 * 60 * 60 * 24);
        if (diffDays > 0 && diffDays < 30) {
          replyDelaysDays.push(diffDays);
        }
      }
    }
  }

  // Also pull conversations for these leads
  const { data: convos } = await supabase
    .from('conversations')
    .select('lead_id, created_at')
    .in('classification', ['interested', 'meeting_booked'])
    .in('lead_id', leadIds)
    .limit(500);

  if (convos?.length) {
    // Re-fetch pushed_at since the first query only selected id
    const { data: leadsWithPush } = await supabase
      .from('pipeline_leads')
      .select('id, pushed_at')
      .in('id', leadIds);

    const pushMap = new Map(
      (leadsWithPush || []).map((l) => [l.id, l.pushed_at as string | null])
    );

    for (const convo of convos) {
      const pushedAt = pushMap.get(convo.lead_id);
      if (pushedAt && convo.created_at) {
        const pushMs = new Date(pushedAt).getTime();
        const replyMs = new Date(convo.created_at).getTime();
        const diffDays = (replyMs - pushMs) / (1000 * 60 * 60 * 24);
        if (diffDays > 0 && diffDays < 30) {
          replyDelaysDays.push(diffDays);
        }
      }
    }
  }

  if (replyDelaysDays.length < MIN_SAMPLES) {
    return null;
  }

  const med = median(replyDelaysDays);
  return delaysFromMedianReplyDays(med);
}
