// src/lib/followups/scheduler.ts
// Stores and processes scheduled follow-ups from playbook actions.
// Converts playbook follow_up_action strings into real scheduled records.

import { supabase } from '@/lib/supabase/client';

const ACTION_DELAYS: Record<string, number> = {
  schedule_follow_up_3_days: 3,
  schedule_follow_up_30_days: 30,
  schedule_follow_up_45_days: 45,
  schedule_follow_up_60_days: 60,
  create_referral_follow_up: 3,
};

/**
 * Schedule a follow-up from a playbook action.
 * Called after a reply is stored and auto-sent (or approved).
 */
export async function scheduleFollowUp(params: {
  leadEmail: string;
  leadId: string | null;
  replyId: string;
  action: string;
  campaignId: string | null;
  oooReturnDate?: string | null;
}): Promise<void> {
  let delayDays: number;

  if (params.action === 'schedule_follow_up_from_ooo') {
    if (params.oooReturnDate) {
      // OOO with parsed date: schedule for return date + 1 day
      const returnDate = new Date(params.oooReturnDate);
      const now = new Date();
      delayDays = Math.max(1, Math.ceil((returnDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    } else {
      // OOO but date couldn't be parsed — default to 7 days
      delayDays = 7;
    }
  } else {
    delayDays = ACTION_DELAYS[params.action];
    if (!delayDays) return; // Unknown action — skip
  }

  const scheduledFor = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('scheduled_followups').insert({
    lead_email: params.leadEmail,
    lead_id: params.leadId,
    reply_id: params.replyId,
    action: params.action,
    campaign_id: params.campaignId,
    scheduled_for: scheduledFor,
    status: 'pending',
  }).then(null, (err) => {
    console.error('[followup-scheduler] Failed to schedule:', err);
  });
}

/**
 * Process all due follow-ups. Called from daily cron.
 * Re-enqueues leads back into the reply engine for a follow-up touch.
 */
export async function processDueFollowups(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const now = new Date().toISOString();

  const { data: due } = await supabase
    .from('scheduled_followups')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .limit(20);

  if (!due?.length) return { processed: 0, sent: 0, failed: 0 };

  const { sendReply } = await import('@/lib/instantly');
  let sent = 0;
  let failed = 0;

  for (const followup of due) {
    try {
      // Look up lead for context
      const { data: lead } = await supabase
        .from('pipeline_leads')
        .select('first_name, company_name, signal_summary, instantly_campaign_id')
        .eq('email', followup.lead_email)
        .maybeSingle();

      const campaignId = followup.campaign_id || lead?.instantly_campaign_id;
      if (!campaignId) {
        await supabase.from('scheduled_followups')
          .update({ status: 'failed', completed_at: now })
          .eq('id', followup.id);
        failed++;
        continue;
      }

      const firstName = lead?.first_name || '';
      const body = buildFollowUpBody(followup.action, firstName);

      const result = await sendReply(campaignId, followup.lead_email, body);

      await supabase.from('scheduled_followups')
        .update({
          status: result.success ? 'sent' : 'failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', followup.id);

      if (result.success) sent++;
      else failed++;
    } catch (err) {
      console.error(`[followup-scheduler] Failed to process ${followup.id}:`, err);
      await supabase.from('scheduled_followups')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', followup.id);
      failed++;
    }
  }

  return { processed: due.length, sent, failed };
}

function buildFollowUpBody(action: string, firstName: string): string {
  const name = firstName || 'there';
  switch (action) {
    case 'schedule_follow_up_30_days':
      return `Hey ${name}, circling back on this. Any shift in priorities since we last connected? Happy to chat if the timing works better now.`;
    case 'schedule_follow_up_45_days':
    case 'schedule_follow_up_60_days':
      return `Hey ${name}, checking in. Wanted to see if anything's changed on your end since we last spoke. No pressure either way.`;
    case 'schedule_follow_up_3_days':
    case 'create_referral_follow_up':
      return `Hey ${name}, just following up on our last exchange. Let me know if you'd like to pick this back up.`;
    case 'schedule_follow_up_from_ooo':
      return `Hey ${name}, hope you had a good time away. Wanted to resurface this in case it's still relevant. Happy to chat whenever works.`;
    default:
      return `Hey ${name}, circling back on this. Let me know if you'd like to continue the conversation.`;
  }
}
