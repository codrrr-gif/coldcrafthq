// ============================================
// Instantly Webhook — The Orchestrator
// ============================================
// Every reply flows through here. This is the brain stem.
//
// Flow:
// 1. Validate webhook
// 2. Fetch full thread from Instantly
// 3. AI categorizes with sub-categories + confidence
// 4. Route based on category:
//    - Interested → Deep research + AI draft + auto-send check
//    - Soft No → AI draft + auto-send check
//    - Hard No → Auto-tag, delete, blocklist (no human needed)
//    - Custom → Handle per sub-category
// 5. Auto-send if confidence is high enough
// 6. Slack notify based on urgency
// 7. Store everything in dashboard

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { routeInboundReply } from '@/lib/conversation/auto-router';
import { getThread, tagLead, deleteLead, blockEmail } from '@/lib/instantly';
import { categorizeReply } from '@/lib/ai/categorize';
import { draftReply } from '@/lib/ai/draft-reply';
import { shouldAutoSend, executeAutoSend } from '@/lib/ai/auto-send';
import { determineOutcome, scoreReplyOutcome } from '@/lib/ai/outcomes';
import { recordEmailOutcome } from '@/lib/verify/outcomes-db';
import {
  notifyHotLead,
  notifyReviewNeeded,
  notifyLegalThreat,
} from '@/lib/slack';
import { markInterestedInCrm, logActivityToClose } from '@/lib/crm/close-sync';
import { requireSecret } from '@/lib/auth/api-auth';
import { insertActivity } from '@/lib/portal/activity';
import { getPlaybook } from '@/lib/ai/playbooks';
import { scheduleFollowUp } from '@/lib/followups/scheduler';
import type { ThreadMessage } from '@/lib/types';
import type { SubCategory } from '@/lib/ai/playbooks';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Auth is mandatory — reject if secret not configured
    const authErr = requireSecret(req);
    if (authErr) return authErr;

    const payload = await req.json();
    const {
      campaign_id,
      lead_email,
      lead_id,
      reply_text,
      lead_name: payloadLeadName,
      lead_company_name: payloadCompany,
    } = payload;

    if (!lead_email || !reply_text) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_email, reply_text' },
        { status: 400 }
      );
    }

    // Idempotency check — skip duplicate webhooks
    // NOTE: Requires ALTER TABLE replies ADD COLUMN message_hash TEXT;
    // CREATE INDEX idx_replies_message_hash ON replies(message_hash);
    const crypto = await import('crypto');
    const messageHash = crypto.createHash('sha256').update(`${lead_email}:${reply_text}`).digest('hex');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingReply } = await supabase
      .from('replies')
      .select('id')
      .eq('message_hash', messageHash)
      .gte('created_at', fiveMinutesAgo)
      .limit(1);

    if (existingReply?.length) {
      return NextResponse.json({ success: true, id: existingReply[0].id, deduplicated: true });
    }

    // Record reply as a valid signal — non-blocking, best data point we can get
    recordEmailOutcome(lead_email, 'replied', {
      campaign_id: campaign_id || undefined,
      source: 'instantly',
    }).catch(console.error);

    // Step 1: Fetch full thread from Instantly
    let threadHistory: ThreadMessage[] = [];
    try {
      if (campaign_id) {
        threadHistory = await getThread(campaign_id, lead_email);
      }
    } catch (err) {
      console.error('Failed to fetch thread:', err);
    }

    // Step 2: AI categorizes with chain-of-thought reasoning
    const categorization = await categorizeReply(reply_text, threadHistory);
    const {
      category,
      sub_category: subCategory,
      confidence,
      tone,
      urgency,
    } = categorization;

    // Use AI-extracted names if payload didn't have them
    const leadName = payloadLeadName || categorization.prospect_name;
    const leadCompany = payloadCompany || categorization.prospect_company;

    // Step 2.5: Chain detection — is this a follow-up to a reply we already sent?
    let parentReplyId: string | null = null;
    try {
      const { data: parentReply } = await supabase
        .from('replies')
        .select('id')
        .eq('lead_email', lead_email)
        .eq('status', 'sent')
        .is('outcome', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (parentReply?.length) {
        const pid = parentReply[0].id as string;
        parentReplyId = pid;
        // Score the parent reply's outcome based on this follow-up (non-blocking)
        const outcome = determineOutcome(category);
        scoreReplyOutcome(pid, '', outcome, reply_text).catch(console.error);
      }
    } catch (err) {
      console.error('Chain detection failed:', err);
    }

    // Step 3: Route based on category
    let aiReply = '';
    let research = null;
    let knowledgeUsed = '';
    let frameworkUsed = '';
    let aiReasoning = '';
    let alternativeReply: string | null = null;
    let replyConfidence = 0;
    let status = 'pending';
    let autoSent = false;
    let autoSendReason: string | null = null;

    if (category === 'hard_no') {
      // === HARD NO: Auto-handle immediately ===
      try {
        await tagLead(lead_email, 'HARD NO');
        if (campaign_id) await deleteLead(campaign_id, lead_email);
        await blockEmail(lead_email);
        status = 'skipped';

        // Alert on legal threats
        if (subCategory === 'hard_no.legal_threat') {
          await notifyLegalThreat(lead_email, reply_text);
        }
      } catch (err) {
        console.error('Failed to handle hard no:', err);
        status = 'pending'; // Fall back to human review
      }
    } else if (category === 'interested' || category === 'soft_no' || category === 'custom') {
      // === Tag the lead in Instantly ===
      const tagMap: Record<string, string> = {
        interested: 'Interested',
        soft_no: 'SOFT NO',
        custom: 'Custom',
      };
      try {
        await tagLead(lead_email, tagMap[category] || 'Custom');
      } catch (err) {
        console.error('Failed to tag lead:', err);
      }

      // === Draft reply using playbook + research + knowledge ===
      try {
        const draftResult = await draftReply(
          subCategory as SubCategory,
          reply_text,
          threadHistory,
          lead_email,
          leadName || null,
          leadCompany || null
        );

        aiReply = draftResult.reply;
        replyConfidence = draftResult.confidence;
        frameworkUsed = draftResult.framework_used;
        knowledgeUsed = draftResult.knowledge_used.join(', ');
        aiReasoning = draftResult.reasoning;
        alternativeReply = draftResult.alternative_reply;
        research = draftResult.research;
      } catch (err) {
        console.error('Failed to draft reply:', err);
      }
    }

    // Step 4: Store in database
    const responseTime = Date.now() - startTime;

    // Resolve client_id from pipeline_leads, fallback to internal client
    let clientId = '00000000-0000-0000-0000-000000000001';
    try {
      const { data: pl } = await supabase
        .from('pipeline_leads')
        .select('client_id')
        .eq('email', lead_email)
        .not('client_id', 'is', null)
        .limit(1)
        .single();
      if (pl?.client_id) clientId = pl.client_id;
    } catch {}

    const { data: replyRecord, error: insertError } = await supabase
      .from('replies')
      .insert({
        instantly_lead_id: lead_id || null,
        instantly_campaign_id: campaign_id || null,
        lead_email,
        lead_name: leadName || null,
        lead_company: leadCompany || null,
        category,
        sub_category: subCategory,
        original_message: reply_text,
        thread_history: threadHistory,
        ai_reply: aiReply || null,
        confidence: replyConfidence,
        status,
        research: research?.raw_research || null,
        research_data: research ? {
          company_overview: research.company_overview,
          pain_signals: research.pain_signals,
          opportunity_signals: research.opportunity_signals,
          connection_points: research.connection_points,
        } : null,
        knowledge_used: knowledgeUsed || null,
        framework_used: frameworkUsed || null,
        ai_reasoning: aiReasoning || null,
        alternative_reply: alternativeReply,
        tone,
        urgency,
        response_time_ms: responseTime,
        auto_sent: false,
        auto_send_reason: null,
        parent_reply_id: parentReplyId,
        message_hash: messageHash,
        client_id: clientId,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to store reply:', insertError);
      return NextResponse.json({ error: 'Failed to store reply' }, { status: 500 });
    }

    // Wire activity feed
    if (clientId !== '00000000-0000-0000-0000-000000000001') {
      insertActivity(clientId, 'reply_received', `Reply from ${leadName || lead_email} — ${category}`, reply_text?.substring(0, 150)).catch(() => {});
    }

    // Link the outcome_reply_id on the parent now that we have the new reply's ID
    if (parentReplyId && replyRecord) {
      try {
        await supabase
          .from('replies')
          .update({ outcome_reply_id: replyRecord.id })
          .eq('id', parentReplyId);
      } catch (err) {
        console.error('Failed to link outcome_reply_id:', err);
      }
    }

    // Step 5: Auto-send check
    if (status === 'pending' && aiReply && replyRecord) {
      const autoSendDecision = await shouldAutoSend(
        subCategory as SubCategory,
        replyConfidence,
        aiReply
      );

      if (autoSendDecision.should_auto_send) {
        const sent = await executeAutoSend(replyRecord.id, 'high_confidence');
        if (sent) {
          autoSent = true;
          autoSendReason = 'high_confidence';
          status = 'sent';
        }
      }
    }

    // Step 5.5: Schedule follow-up if playbook defines one
    if (replyRecord && subCategory) {
      try {
        const playbook = getPlaybook(subCategory as SubCategory);
        if (playbook.follow_up_action && !playbook.follow_up_action.startsWith('blocklist')) {
          scheduleFollowUp({
            leadEmail: lead_email,
            leadId: lead_id || null,
            replyId: replyRecord.id,
            action: playbook.follow_up_action,
            campaignId: campaign_id || null,
            oooReturnDate: subCategory === 'custom.ooo' ? extractOooDate(reply_text) : null,
          }).catch(console.error);
        }
      } catch (err) {
        console.error('[webhook] Follow-up scheduling failed:', err);
      }
    }

    // Sync interested reply to Close CRM (fire-and-forget)
    if (category === 'interested') {
      markInterestedInCrm({
        email: lead_email,
        company: leadCompany,
        lead_name: leadName,
        reply_summary: categorization.summary,
      }).catch(console.error);
    }

    // Log inbound reply to Close timeline
    logActivityToClose({
      type: 'email_replied',
      leadEmail: lead_email,
      subject: 'Re: ColdCraft Outbound',
      body: reply_text?.substring(0, 500) || '',
      direction: 'incoming',
    }).catch(() => {});

    // Step 6: Slack notifications
    if (category === 'interested') {
      await notifyHotLead(
        lead_email,
        leadName || null,
        leadCompany || null,
        categorization.summary,
        confidence,
        autoSent
      );
    } else if (status === 'pending' && aiReply) {
      await notifyReviewNeeded(
        lead_email,
        leadName || null,
        leadCompany || null,
        category,
        subCategory,
        replyConfidence,
        categorization.summary
      );
    }

    // Route inbound replies through conversation intelligence
    const eventType = String(payload.event_type || payload.type || '');
    if (eventType === 'reply_received' || eventType === 'email_reply' || eventType === 'REPLY' || reply_text) {
      if (reply_text) {
        routeInboundReply({
          leadId: null,
          channel: 'email',
          replyText: reply_text,
          fromEmail: lead_email,
        }).catch(console.error);
      }
    }

    return NextResponse.json({
      success: true,
      id: replyRecord?.id,
      category,
      sub_category: subCategory,
      confidence,
      reply_confidence: replyConfidence,
      status,
      auto_sent: autoSent,
      auto_send_reason: autoSendReason,
      has_draft: !!aiReply,
      has_alternative: !!alternativeReply,
      framework_used: frameworkUsed,
      response_time_ms: responseTime,
    });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Try to extract a return date from OOO auto-replies */
function extractOooDate(text: string): string | null {
  // Match common patterns: "back on March 15", "returning Jan 5, 2026", "return 3/15"
  const patterns = [
    /(?:back|return(?:ing)?)\s+(?:on\s+)?(\w+ \d{1,2}(?:,?\s*\d{4})?)/i,
    /(?:back|return(?:ing)?)\s+(?:on\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime()) && parsed > new Date()) return parsed.toISOString();
    }
  }
  return null;
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'coldcraft-reply-engine',
    version: '3.0',
    features: [
      'granular-categorization',
      'playbook-driven-replies',
      'confidence-auto-send',
      'deep-research',
      'self-learning',
      'slack-notifications',
      'outcome-tracking',
      'auto-threshold-tuning',
      'self-improvement-loop',
    ],
  });
}
