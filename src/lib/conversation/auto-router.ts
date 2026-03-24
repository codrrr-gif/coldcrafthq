// src/lib/conversation/auto-router.ts
// Routes inbound replies: classify → draft → store → take action.

import { classifyReply } from './reply-classifier';
import { draftReply } from './reply-drafter';
import { supabase } from '@/lib/supabase/client';

export async function routeInboundReply(params: {
  leadId: string | null;
  channel: 'email' | 'linkedin' | 'voice';
  replyText: string;
  fromEmail?: string;
}): Promise<{ classification: string; draftedReply: string | null }> {
  // Look up lead by ID or email
  let lead = null;
  if (params.leadId) {
    const { data } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('id', params.leadId)
      .maybeSingle();
    lead = data;
  } else if (params.fromEmail) {
    const { data } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('email', params.fromEmail)
      .maybeSingle();
    lead = data;
  }

  const classification = await classifyReply(params.replyText);

  const drafted = lead ? await draftReply({
    classification,
    inboundText: params.replyText,
    firstName: lead.first_name || 'there',
    companyName: lead.company_name || '',
    signalSummary: lead.signal_summary,
  }) : null;

  // Store in conversations table
  await Promise.resolve(
    supabase.from('conversations').insert({
      lead_id: params.leadId || lead?.id || null,
      channel: params.channel,
      inbound_text: params.replyText,
      classification,
      drafted_reply: drafted,
    })
  ).catch(console.error);

  // Auto-actions
  if (classification === 'unsubscribe' && lead) {
    await Promise.resolve(
      supabase.from('pipeline_leads')
        .update({ status: 'filtered', failure_reason: 'unsubscribed' })
        .eq('id', lead.id)
    ).catch(console.error);
  }

  return { classification, draftedReply: drafted };
}
