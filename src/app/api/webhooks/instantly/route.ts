// ============================================
// Instantly Webhook — The Orchestrator
// ============================================
// Every reply flows through here. This is the brain stem.
//
// Fast path (returns 200 in <1s):
//   auth → dedup → insert minimal row → waitUntil(processReplyAsync)
//
// Background (processReplyAsync):
//   fetch thread → categorize → route by category → draft →
//   auto-send check → activity/CRM/Slack/pipeline → UPDATE row
//
// Why ack-fast: Instantly's webhook timeout is ~10s. Our drafting path
// routinely runs 15–25s (Perplexity + Claude). Blocking on it causes
// Instantly to count failures and auto-disable the webhook.

import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
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

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Signal campaign IDs from env — anything else is a list campaign
function isSignalCampaign(campaignId: string | null): boolean {
  if (!campaignId) return false;
  const signalIds = [
    process.env.CAMPAIGN_ID_DEFAULT,
    process.env.CAMPAIGN_ID_FUNDING,
    process.env.CAMPAIGN_ID_JOB_POSTING,
    process.env.CAMPAIGN_ID_LEADERSHIP,
    process.env.CAMPAIGN_ID_NEWS,
    process.env.CAMPAIGN_ID_INTENT,
    process.env.CAMPAIGN_ID_TECH_STACK,
    process.env.CAMPAIGN_ID_COMPETITOR,
    process.env.CAMPAIGN_ID_JOB_CHANGE,
  ].filter(Boolean);
  return signalIds.includes(campaignId);
}

// Detect obvious OOO auto-replies without burning an AI call
function isObviousOoo(text: string): boolean {
  const lower = text.toLowerCase();
  const patterns = [
    /out of (?:the )?office/,
    /i(?:'m| am) (?:currently )?(?:out|away|on (?:vacation|holiday|leave|pto))/,
    /auto(?:matic)?[- ]?reply/,
    /i will (?:be )?(?:back|return)/,
    /limited access to email/,
    /away from (?:the )?office/,
    /on (?:annual |parental |medical )?leave/,
    /(?:no|limited) access to (?:my )?email/,
  ];
  return patterns.some(p => p.test(lower));
}

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

    // Cooldown dedup — skip if we processed a reply from this email in the last hour
    // Catches OOO auto-replies with slightly different text (e.g. different subject lines)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentReply } = await supabase
      .from('replies')
      .select('id, sub_category')
      .eq('lead_email', lead_email)
      .gte('created_at', oneHourAgo)
      .limit(1);

    if (recentReply?.length) {
      return NextResponse.json({ success: true, id: recentReply[0].id, deduplicated: true, reason: 'cooldown' });
    }

    // Resolve client_id early — used by processReplyAsync for knowledge filtering
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

    // Insert a minimal placeholder row so we can ack in <1s.
    // The background processor UPDATEs this row with category/draft/etc.
    // category='custom' + status='pending' is a safe fallback if bg work crashes.
    const { data: replyRecord, error: insertError } = await supabase
      .from('replies')
      .insert({
        instantly_lead_id: lead_id || null,
        instantly_campaign_id: campaign_id || null,
        lead_email,
        lead_name: payloadLeadName || null,
        lead_company: payloadCompany || null,
        category: 'custom',
        sub_category: null,
        original_message: reply_text,
        status: 'pending',
        message_hash: messageHash,
        client_id: clientId,
        auto_sent: false,
      })
      .select('id')
      .single();

    if (insertError) {
      // Unique constraint on message_hash — race condition duplicate, safe to ignore
      if (insertError.code === '23505' && insertError.message?.includes('message_hash')) {
        const { data: existing } = await supabase.from('replies').select('id').eq('message_hash', messageHash).limit(1);
        return NextResponse.json({ success: true, id: existing?.[0]?.id, deduplicated: true });
      }
      console.error('Failed to store reply:', insertError);
      return NextResponse.json({ error: 'Failed to store reply' }, { status: 500 });
    }

    // Record reply as a valid signal — non-blocking
    recordEmailOutcome(lead_email, 'replied', {
      campaign_id: campaign_id || undefined,
      source: 'instantly',
    }).catch(console.error);

    // Run the heavy work in the background. Vercel keeps the function
    // alive until this promise resolves, up to maxDuration (60s).
    waitUntil(
      processReplyAsync({
        replyId: replyRecord!.id,
        leadEmail: lead_email,
        leadId: lead_id,
        campaignId: campaign_id,
        replyText: reply_text,
        payloadLeadName,
        payloadCompany,
        clientId,
        startTime,
      }).catch((err) => {
        console.error('[webhook] processReplyAsync crashed:', err);
      })
    );

    return NextResponse.json({
      success: true,
      id: replyRecord!.id,
      status: 'processing',
      response_time_ms: Date.now() - startTime,
    });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// Background processor
// ============================================
interface ProcessReplyCtx {
  replyId: string;
  leadEmail: string;
  leadId: string | null;
  campaignId: string | null;
  replyText: string;
  payloadLeadName: string | null;
  payloadCompany: string | null;
  clientId: string;
  startTime: number;
}

async function processReplyAsync(ctx: ProcessReplyCtx): Promise<void> {
  const {
    replyId, leadEmail, leadId, campaignId, replyText,
    payloadLeadName, payloadCompany, clientId, startTime,
  } = ctx;

  // Step 1: Fetch full thread from Instantly
  let threadHistory: ThreadMessage[] = [];
  try {
    if (campaignId) threadHistory = await getThread(campaignId, leadEmail);
  } catch (err) {
    console.error('[processReply] Failed to fetch thread:', err);
  }

  // Pre-AI OOO detection — skip expensive AI call for obvious auto-replies
  const detectedOoo = isObviousOoo(replyText);

  // Step 2: AI categorizes (skip for obvious OOO)
  const categorization = detectedOoo
    ? { category: 'custom' as const, sub_category: 'custom.ooo' as const, confidence: 0.95, tone: 'neutral' as const, urgency: 'low' as const, prospect_name: null, prospect_company: null, summary: 'Out of office auto-reply' }
    : await categorizeReply(replyText, threadHistory);
  const {
    category,
    sub_category: subCategory,
    confidence,
    tone,
    urgency,
  } = categorization;

  const leadName = payloadLeadName || categorization.prospect_name;
  const leadCompany = payloadCompany || categorization.prospect_company;

  // Step 2.5: Chain detection — is this a follow-up to a reply we already sent?
  let parentReplyId: string | null = null;
  try {
    const { data: parentReply } = await supabase
      .from('replies')
      .select('id')
      .eq('lead_email', leadEmail)
      .eq('status', 'sent')
      .is('outcome', null)
      .neq('id', replyId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (parentReply?.length) {
      const pid = parentReply[0].id as string;
      parentReplyId = pid;
      const outcome = determineOutcome(category);
      scoreReplyOutcome(pid, '', outcome, replyText).catch(console.error);
    }
  } catch (err) {
    console.error('[processReply] Chain detection failed:', err);
  }

  // Step 3: Route based on category
  let aiReply = '';
  let research = null;
  let knowledgeUsed = '';
  let frameworkUsed = '';
  let aiReasoning = '';
  let alternativeReply: string | null = null;
  let replyConfidence = 0;
  let status: 'pending' | 'sent' | 'skipped' | 'approved' | 'failed' = 'pending';

  if (category === 'hard_no') {
    // === HARD NO: Auto-handle immediately ===
    try {
      let deleteCampaignId = campaignId;
      if (!deleteCampaignId) {
        const { data: pl } = await supabase
          .from('pipeline_leads')
          .select('instantly_campaign_id')
          .eq('email', leadEmail)
          .not('instantly_campaign_id', 'is', null)
          .limit(1)
          .maybeSingle();
        deleteCampaignId = pl?.instantly_campaign_id || null;
      }

      if (deleteCampaignId) {
        await deleteLead(deleteCampaignId, leadEmail);
      }
      status = 'skipped';

      tagLead(leadEmail, 'HARD NO').catch((err) =>
        console.warn('[processReply] tagLead failed (non-blocking):', err)
      );
      blockEmail(leadEmail).catch((err) =>
        console.warn('[processReply] blockEmail failed (non-blocking):', err)
      );

      if (subCategory === 'hard_no.legal_threat') {
        await notifyLegalThreat(leadEmail, replyText);
      }
    } catch (err) {
      console.error('[processReply] Failed to delete lead (hard no):', err);
      status = 'pending'; // Fall back to human review only if delete fails
    }
  } else if (category === 'interested' || category === 'soft_no' || category === 'custom') {
    // === OOO: Handle based on campaign type ===
    if (subCategory === 'custom.ooo') {
      try {
        if (isSignalCampaign(campaignId)) {
          let deleteCampaignId = campaignId;
          if (!deleteCampaignId) {
            const { data: pl } = await supabase
              .from('pipeline_leads')
              .select('instantly_campaign_id')
              .eq('email', leadEmail)
              .not('instantly_campaign_id', 'is', null)
              .limit(1)
              .maybeSingle();
            deleteCampaignId = pl?.instantly_campaign_id || null;
          }
          if (deleteCampaignId) {
            await deleteLead(deleteCampaignId, leadEmail);
          }
          status = 'skipped';
        } else {
          // List campaign — let stop_on_auto_reply handle the pause
          status = 'skipped';
        }
        tagLead(leadEmail, 'OOO').catch((err) =>
          console.warn('[processReply] OOO tagLead failed (non-blocking):', err)
        );
      } catch (err) {
        console.error('[processReply] Failed to handle OOO:', err);
      }
    }

    // === Tag the lead in Instantly (best-effort) ===
    const tagMap: Record<string, string> = {
      interested: 'Interested',
      soft_no: 'SOFT NO',
      custom: 'Custom',
    };
    if (subCategory !== 'custom.ooo') {
      tagLead(leadEmail, tagMap[category] || 'Custom').catch((err) =>
        console.warn('[processReply] tagLead failed (non-blocking):', err)
      );
    }

    // === Draft reply using playbook + research + knowledge ===
    if (subCategory !== 'custom.ooo') {
      try {
        const draftResult = await draftReply(
          subCategory as SubCategory,
          replyText,
          threadHistory,
          leadEmail,
          leadName || null,
          leadCompany || null,
          clientId
        );

        aiReply = draftResult.reply;
        replyConfidence = draftResult.confidence;
        frameworkUsed = draftResult.framework_used;
        knowledgeUsed = draftResult.knowledge_used.join(', ');
        aiReasoning = draftResult.reasoning;
        alternativeReply = draftResult.alternative_reply;
        research = draftResult.research;
      } catch (err) {
        console.error('[processReply] Failed to draft reply:', err);
      }
    }
  }

  // Step 4: UPDATE the placeholder row with enriched data
  const responseTime = Date.now() - startTime;

  const { error: updateError } = await supabase
    .from('replies')
    .update({
      lead_name: leadName || null,
      lead_company: leadCompany || null,
      category,
      sub_category: subCategory,
      thread_history: threadHistory,
      ai_reply: aiReply || null,
      final_reply: aiReply || null,
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
      parent_reply_id: parentReplyId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', replyId);

  if (updateError) {
    console.error('[processReply] Failed to update reply:', updateError);
    return;
  }

  // Wire activity feed
  if (clientId !== '00000000-0000-0000-0000-000000000001') {
    insertActivity(
      clientId,
      'reply_received',
      `Reply from ${leadName || leadEmail} — ${category}`,
      replyText?.substring(0, 150)
    ).catch(() => {});
  }

  // Link outcome_reply_id on parent
  if (parentReplyId) {
    try {
      await supabase
        .from('replies')
        .update({ outcome_reply_id: replyId })
        .eq('id', parentReplyId);
    } catch (err) {
      console.error('[processReply] Failed to link outcome_reply_id:', err);
    }
  }

  // Step 5: Auto-send check
  let autoSent = false;
  if (status === 'pending' && aiReply) {
    const autoSendDecision = await shouldAutoSend(
      subCategory as SubCategory,
      replyConfidence,
      aiReply
    );

    if (autoSendDecision.should_auto_send) {
      const sent = await executeAutoSend(replyId, 'high_confidence');
      if (sent) {
        autoSent = true;
        status = 'sent';
      }
    }
  }

  // Step 5.5: Schedule follow-up if playbook defines one
  if (subCategory) {
    try {
      const playbook = getPlaybook(subCategory as SubCategory);
      if (playbook.follow_up_action && !playbook.follow_up_action.startsWith('blocklist')) {
        scheduleFollowUp({
          leadEmail,
          leadId: leadId || null,
          replyId,
          action: playbook.follow_up_action,
          campaignId: campaignId || null,
          oooReturnDate: subCategory === 'custom.ooo' ? extractOooDate(replyText) : null,
        }).catch(console.error);
      }
    } catch (err) {
      console.error('[processReply] Follow-up scheduling failed:', err);
    }
  }

  // Step 5.6: Auto-process referrals
  const hasEmailInReply = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(replyText || '');
  const hasReferralLanguage = /(?:talk to|reach out to|contact|speak with|connect with|forward(?:ed|ing)?|handles?|manages?|right person|better person|you should (?:email|call)|instead.{0,30}@|point(?:ed|ing)?\s+(?:you|me))/i.test(replyText || '');
  const shouldCheckReferral = subCategory === 'interested.referral' ||
    subCategory === 'custom.forwarded' ||
    (subCategory === 'custom.ooo' && hasEmailInReply) ||
    (hasReferralLanguage && hasEmailInReply);
  if (shouldCheckReferral) {
    try {
      const referral = extractReferral(replyText, leadCompany || null);
      if (referral) {
        const { data: sourceLead } = await supabase
          .from('pipeline_leads')
          .select('signal_type, company_domain, personalized_opener')
          .eq('email', leadEmail)
          .limit(1)
          .maybeSingle();

        processReferral({
          referral,
          sourceLeadEmail: leadEmail,
          sourceReplyId: replyId,
          signalType: sourceLead?.signal_type || null,
          companyDomain: sourceLead?.company_domain || null,
          personalizedOpener: null,
          sourceCampaignId: campaignId || null,
        }).catch(console.error);
      }
    } catch (err) {
      console.error('[processReply] Referral extraction failed:', err);
    }
  }

  // Update pipeline_leads status — feeds learning/ICP-learner modules
  try {
    if (category === 'interested') {
      await supabase
        .from('pipeline_leads')
        .update({ status: 'replied', updated_at: new Date().toISOString() })
        .eq('email', leadEmail)
        .in('status', ['pushed', 'contacted']);
    } else if (category === 'hard_no') {
      await supabase
        .from('pipeline_leads')
        .update({ status: 'opted_out', updated_at: new Date().toISOString() })
        .eq('email', leadEmail)
        .in('status', ['pushed', 'contacted']);
    } else if (category === 'soft_no' || category === 'custom') {
      await supabase
        .from('pipeline_leads')
        .update({ status: 'replied', updated_at: new Date().toISOString() })
        .eq('email', leadEmail)
        .in('status', ['pushed', 'contacted']);
    }
  } catch (err) {
    console.error('[processReply] Failed to update pipeline_leads status:', err);
  }

  // Signal performance feedback loop
  recordReplyFeedback(leadEmail, category).catch(console.error);

  // Sync interested reply to Close CRM (fire-and-forget)
  if (category === 'interested') {
    markInterestedInCrm({
      email: leadEmail,
      company: leadCompany,
      lead_name: leadName,
      reply_summary: categorization.summary,
    }).catch(console.error);
  }

  // Log inbound reply to Close timeline
  logActivityToClose({
    type: 'email_replied',
    leadEmail,
    subject: 'Re: ColdCraft Outbound',
    body: replyText?.substring(0, 500) || '',
    direction: 'incoming',
  }).catch(() => {});

  // Step 6: Slack notifications
  if (category === 'interested') {
    await notifyHotLead(
      leadEmail,
      leadName || null,
      leadCompany || null,
      categorization.summary,
      confidence,
      autoSent
    );
  } else if (status === 'pending' && aiReply) {
    await notifyReviewNeeded(
      leadEmail,
      leadName || null,
      leadCompany || null,
      category,
      subCategory,
      replyConfidence,
      categorization.summary
    );
  }
}

/** Try to extract a return date from OOO auto-replies */
function extractOooDate(text: string): string | null {
  const patterns = [
    /(?:back|return(?:ing)?|available)\s+(?:on\s+)?(\w+ \d{1,2}(?:,?\s*\d{4})?)/i,
    /(?:back|return(?:ing)?|available)\s+(?:on\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
    /(?:until|through|till)\s+(\w+ \d{1,2}(?:,?\s*\d{4})?)/i,
    /(?:until|through|till)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
    /(?:until|through|till)\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let dateStr = match[1];
      if (/^[A-Z][a-z]+$/.test(dateStr)) dateStr = `${dateStr} 1`;
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
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
    version: '3.1',
    features: [
      'ack-fast-waitUntil',
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
