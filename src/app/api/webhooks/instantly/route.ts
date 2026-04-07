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
import { recordReplyFeedback } from '@/lib/pipeline/signal-scoring-feedback';
import { requireSecret } from '@/lib/auth/api-auth';
import { insertActivity } from '@/lib/portal/activity';
import { getPlaybook } from '@/lib/ai/playbooks';
import { scheduleFollowUp } from '@/lib/followups/scheduler';
import { extractReferral, processReferral } from '@/lib/referrals/extract';
import type { ThreadMessage } from '@/lib/types';
import type { SubCategory } from '@/lib/ai/playbooks';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Auth is mandatory — reject if secret not configured
    const authErr = requireSecret(req);
    if (authErr) return authErr;

    const payload = await req.json();

    // Normalize Instantly's payload — they send `lead` not `lead_email`,
    // and reply text lives in `body.text` not `reply_text`
    const campaign_id = payload.campaign_id || null;
    const lead_email = payload.lead_email || payload.from_address_email || payload.lead || null;
    const lead_id = payload.lead_id || null;
    const reply_text = payload.reply_text || payload.body?.text || payload.content_preview || null;
    const payloadLeadName = payload.lead_name || payload.from_address_json?.[0]?.name || null;
    const payloadCompany = payload.lead_company_name || null;

    if (!lead_email || !reply_text) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_email, reply_text' },
        { status: 400 }
      );
    }

    // Idempotency check — skip duplicate webhooks (no time window)
    const crypto = await import('crypto');
    const messageHash = crypto.createHash('sha256').update(`${lead_email}:${reply_text}`).digest('hex');
    const { data: existingReply } = await supabase
      .from('replies')
      .select('id')
      .eq('message_hash', messageHash)
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
      // Must remove from campaign + blocklist to protect sender reputation
      try {
        // Delete from campaign FIRST — this is the critical action
        let deleteCampaignId = campaign_id;
        if (!deleteCampaignId) {
          const { data: pl } = await supabase
            .from('pipeline_leads')
            .select('instantly_campaign_id')
            .eq('email', lead_email)
            .not('instantly_campaign_id', 'is', null)
            .limit(1)
            .maybeSingle();
          deleteCampaignId = pl?.instantly_campaign_id || null;
        }

        if (deleteCampaignId) {
          await deleteLead(deleteCampaignId, lead_email);
        }
        status = 'skipped';

        // Tag and block are best-effort — don't let failures prevent deletion
        tagLead(lead_email, 'HARD NO').catch((err) =>
          console.warn('[webhook] tagLead failed (non-blocking):', err)
        );
        blockEmail(lead_email).catch((err) =>
          console.warn('[webhook] blockEmail failed (non-blocking):', err)
        );

        // Alert on legal threats
        if (subCategory === 'hard_no.legal_threat') {
          await notifyLegalThreat(lead_email, reply_text);
        }
      } catch (err) {
        console.error('Failed to delete lead (hard no):', err);
        status = 'pending'; // Fall back to human review only if delete fails
      }
    } else if (category === 'interested' || category === 'soft_no' || category === 'custom') {
      // === OOO: Remove from campaign (no point emailing someone on leave) ===
      if (subCategory === 'custom.ooo') {
        try {
          let deleteCampaignId = campaign_id;
          if (!deleteCampaignId) {
            const { data: pl } = await supabase
              .from('pipeline_leads')
              .select('instantly_campaign_id')
              .eq('email', lead_email)
              .not('instantly_campaign_id', 'is', null)
              .limit(1)
              .maybeSingle();
            deleteCampaignId = pl?.instantly_campaign_id || null;
          }
          if (deleteCampaignId) {
            await deleteLead(deleteCampaignId, lead_email);
          }
          await tagLead(lead_email, 'OOO');
          status = 'skipped';
        } catch (err) {
          console.error('Failed to handle OOO:', err);
        }
      }

      // === Tag the lead in Instantly ===
      const tagMap: Record<string, string> = {
        interested: 'Interested',
        soft_no: 'SOFT NO',
        custom: 'Custom',
      };
      try {
        if (subCategory !== 'custom.ooo') {
          await tagLead(lead_email, tagMap[category] || 'Custom');
        }
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

    // Step 5.6: Auto-process referrals — extract referred person, push to pipeline
    // Runs on explicit referral categories AND any reply with referral language,
    // because the AI categorizer often classifies "talk to Sarah instead" as soft_no
    const hasEmailInReply = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(reply_text || '');
    const hasReferralLanguage = /(?:talk to|reach out to|contact|speak with|connect with|forward(?:ed|ing)?|handles?|manages?|right person|better person|you should (?:email|call)|instead.{0,30}@|point(?:ed|ing)?\s+(?:you|me))/i.test(reply_text || '');
    const shouldCheckReferral = subCategory === 'interested.referral' ||
      subCategory === 'custom.forwarded' ||
      (subCategory === 'custom.ooo' && hasEmailInReply) ||
      (hasReferralLanguage && hasEmailInReply);
    if (shouldCheckReferral) {
      try {
        const referral = extractReferral(reply_text, leadCompany || null);
        if (referral) {
          // Look up original lead for context
          const { data: sourceLead } = await supabase
            .from('pipeline_leads')
            .select('signal_type, company_domain, personalized_opener')
            .eq('email', lead_email)
            .limit(1)
            .maybeSingle();

          processReferral({
            referral,
            sourceLeadEmail: lead_email,
            sourceReplyId: replyRecord?.id || '',
            signalType: sourceLead?.signal_type || null,
            companyDomain: sourceLead?.company_domain || null,
            personalizedOpener: null,
            sourceCampaignId: campaign_id || null,
          }).catch(console.error); // fire-and-forget
        }
      } catch (err) {
        console.error('[webhook] Referral extraction failed:', err);
      }
    }

    // Update pipeline_leads status — this feeds the learning/ICP-learner modules
    try {
      if (category === 'interested') {
        await supabase
          .from('pipeline_leads')
          .update({ status: 'replied', updated_at: new Date().toISOString() })
          .eq('email', lead_email)
          .in('status', ['pushed', 'contacted']);
      } else if (category === 'hard_no') {
        await supabase
          .from('pipeline_leads')
          .update({ status: 'opted_out', updated_at: new Date().toISOString() })
          .eq('email', lead_email)
          .in('status', ['pushed', 'contacted']);
      } else if (category === 'soft_no' || category === 'custom') {
        await supabase
          .from('pipeline_leads')
          .update({ status: 'replied', updated_at: new Date().toISOString() })
          .eq('email', lead_email)
          .in('status', ['pushed', 'contacted']);
      }
    } catch (err) {
      console.error('[webhook] Failed to update pipeline_leads status:', err);
    }

    // Signal performance feedback loop — track which signals produce replies
    recordReplyFeedback(lead_email, category).catch(console.error);

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

    // Duplicate classification path removed — was burning 4x Claude API calls per reply
    // with a separate taxonomy (7 categories vs 17 sub-categories) that was never used.

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
  const patterns = [
    // "back on March 15", "returning Jan 5, 2026"
    /(?:back|return(?:ing)?|available)\s+(?:on\s+)?(\w+ \d{1,2}(?:,?\s*\d{4})?)/i,
    // "back on 3/15", "return 4/6/2026"
    /(?:back|return(?:ing)?|available)\s+(?:on\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
    // "away until March 15", "out until June 1", "until 4/6"
    /(?:until|through|till)\s+(\w+ \d{1,2}(?:,?\s*\d{4})?)/i,
    /(?:until|through|till)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
    // "away until June" (month only — assume 1st of that month)
    /(?:until|through|till)\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let dateStr = match[1];
      // Month-only: append "1" so Date can parse it (e.g. "June" → "June 1")
      if (/^[A-Z][a-z]+$/.test(dateStr)) dateStr = `${dateStr} 1`;
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        // If parsed date is in the past (no year given), set to current/next year
        const now = new Date();
        if (parsed < now) {
          parsed.setFullYear(now.getFullYear());
          if (parsed < now) parsed.setFullYear(now.getFullYear() + 1);
        }
        return parsed.toISOString();
      }
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
