// ============================================
// Auto-Send Engine — Speed to Lead
// ============================================
// Confidence-based auto-send + time-based fallback.
// The whole point: hot leads get instant replies.

import { supabase } from '../supabase/client';
import { sendReply } from '../instantly';
import { notifyAutoSend, notifyFailedSend, trackServiceFailure } from '../slack';
import type { SubCategory } from './playbooks';
import { PLAYBOOKS } from './playbooks';
import { getEffectiveThreshold } from './outcomes';

export interface AutoSendDecision {
  should_auto_send: boolean;
  reason: 'high_confidence' | 'timeout' | 'not_eligible' | 'low_confidence' | 'no_reply';
  confidence: number;
  threshold: number;
}

// Decide whether to auto-send based on confidence and playbook rules
// Uses auto-tuned thresholds when available
export async function shouldAutoSend(
  subCategory: SubCategory,
  confidence: number,
  aiReply: string | null
): Promise<AutoSendDecision> {
  if (!aiReply) {
    return { should_auto_send: false, reason: 'no_reply', confidence, threshold: 0 };
  }

  const playbook = PLAYBOOKS[subCategory];

  if (!playbook.auto_send_eligible) {
    return { should_auto_send: false, reason: 'not_eligible', confidence, threshold: 0 };
  }

  const threshold = await getEffectiveThreshold(subCategory);

  if (confidence >= threshold) {
    return { should_auto_send: true, reason: 'high_confidence', confidence, threshold };
  }

  return { should_auto_send: false, reason: 'low_confidence', confidence, threshold };
}

// Execute auto-send for a specific reply
export async function executeAutoSend(
  replyId: string,
  reason: 'high_confidence' | 'timeout'
): Promise<boolean> {
  const { data: reply } = await supabase
    .from('replies')
    .select('*')
    .eq('id', replyId)
    .single();

  const replyText = reply?.final_reply || reply?.revised_reply || reply?.ai_reply;
  if (!reply || reply.status !== 'pending' || !replyText) return false;

  // Validate reply content before sending
  const { validateReplyContent } = await import('./reply-validator');
  const validation = validateReplyContent(replyText);
  if (!validation.valid) {
    console.warn(`[auto-send] Content validation failed for ${replyId}: ${validation.reason}`);
    await supabase
      .from('replies')
      .update({ status: 'pending', auto_send_reason: `validation_failed:${validation.reason}`, updated_at: new Date().toISOString() })
      .eq('id', replyId);
    return false;
  }

  // Send via Instantly
  if (reply.instantly_campaign_id) {
    const result = await sendReply(
      reply.instantly_campaign_id,
      reply.lead_email,
      replyText
    );

    const newStatus = result.success ? 'sent' : 'failed';

    await supabase
      .from('replies')
      .update({
        status: newStatus,
        final_reply: replyText,
        auto_sent: true,
        auto_send_reason: reason,
        send_result: result,
        updated_at: new Date().toISOString(),
      })
      .eq('id', replyId);

    // Slack notifications
    if (result.success) {
      await notifyAutoSend(
        reply.lead_email,
        reply.lead_name,
        reply.sub_category || reply.category,
        reply.confidence || 0,
        reason
      );
    } else {
      await notifyFailedSend(reply.lead_email, result.error || 'Unknown error');
      trackServiceFailure('Instantly', new Error(result.error || 'Send failed')).catch(() => {});
    }

    return result.success;
  }

  // No campaign ID — just mark as approved
  await supabase
    .from('replies')
    .update({
      status: 'approved',
      final_reply: reply.ai_reply,
      auto_sent: true,
      auto_send_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', replyId);

  return true;
}

// Time-based auto-send: find pending replies older than 15 minutes
// with confidence >= 0.80 and auto-send them
export async function processTimeoutAutoSends(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data: staleReplies } = await supabase
    .from('replies')
    .select('id, sub_category, confidence')
    .eq('status', 'pending')
    .eq('auto_sent', false)
    .gte('confidence', 0.80)
    .lte('created_at', fifteenMinutesAgo)
    .not('ai_reply', 'is', null);

  if (!staleReplies?.length) return { processed: 0, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const reply of staleReplies) {
    // Enforce per-playbook threshold (not just the flat 0.80 DB filter)
    const subCat = reply.sub_category as SubCategory;
    if (subCat && PLAYBOOKS[subCat] && !PLAYBOOKS[subCat].auto_send_eligible) continue;

    const effectiveThreshold = await getEffectiveThreshold(subCat);
    if (reply.confidence < effectiveThreshold) continue;

    const success = await executeAutoSend(reply.id, 'timeout');
    if (success) sent++;
    else failed++;
  }

  return { processed: staleReplies.length, sent, failed };
}
