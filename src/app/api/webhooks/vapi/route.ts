// src/app/api/webhooks/vapi/route.ts
// Receives call completion events from Vapi (end-of-call-report).
// Classifies transcript with Claude, logs to CRM, feeds into reply engine.

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { requireVapiSecret } from '@/lib/auth/api-auth';
import { classifyTranscript } from '@/lib/voice/transcript-classifier';
import { logActivityToClose, markInterestedInCrm } from '@/lib/crm/close-sync';
import { routeInboundReply } from '@/lib/conversation/auto-router';
import { sendReply } from '@/lib/instantly';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Vapi webhook payload types (end-of-call-report)

interface VapiCall {
  id?: string;
  startedAt?: string;
  endedAt?: string;
  cost?: number;
  phoneNumber?: { number?: string };
  customer?: { number?: string; name?: string };
}

interface VapiMessage {
  type?: string;
  endedReason?: string;
  call?: VapiCall;
  artifact?: { transcript?: string; recordingUrl?: string; messages?: Array<{ role: string; message: string }> };
  transcript?: string;
  durationSeconds?: number;
  recordingUrl?: string;
}

function extractDuration(call?: VapiCall, msg?: VapiMessage): number {
  if (call?.startedAt && call?.endedAt) {
    const dur = (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000;
    if (dur > 0) return Math.round(dur);
  }
  return msg?.durationSeconds || 0;
}

export async function POST(req: NextRequest) {
  const authErr = requireVapiSecret(req);
  if (authErr) return authErr;

  const body = await req.json() as { message?: VapiMessage };
  const { message } = body;

  if (message?.type !== 'end-of-call-report') {
    return NextResponse.json({ ok: true });
  }

  const callId = message.call?.id;
  if (!callId) return NextResponse.json({ ok: true });

  // Idempotency: skip if this call was already processed
  const { data: existing } = await supabase
    .from('voice_calls')
    .select('id, status')
    .eq('vapi_call_id', callId)
    .eq('status', 'completed')
    .limit(1);

  if (existing?.length) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  // Extract fields — handle both artifact (current) and flat (legacy) payload shapes
  const transcript = message.artifact?.transcript || message.transcript || '';
  const durationSeconds = extractDuration(message.call, message);
  const endedReason = message.endedReason || '';

  // 1. Classify with Claude
  const outcome = await classifyTranscript(transcript, durationSeconds);

  // 2. Update voice_calls record
  await supabase.from('voice_calls').update({
    status: 'completed',
    duration_s: durationSeconds,
    transcript,
    outcome,
    ended_at: new Date().toISOString(),
  }).eq('vapi_call_id', callId);

  // 3. Update touchpoint status
  const isPositive = outcome === 'interested' || outcome === 'meeting_booked';
  await supabase.from('touchpoints').update({
    status: isPositive ? 'replied' : 'delivered',
    replied_at: isPositive ? new Date().toISOString() : null,
  }).eq('external_id', callId);

  // 4. Get lead info for downstream integrations
  const { data: voiceCall } = await supabase
    .from('voice_calls')
    .select('lead_id, phone_number')
    .eq('vapi_call_id', callId)
    .single();

  const leadId = voiceCall?.lead_id;
  if (!leadId) {
    return NextResponse.json({ ok: true, outcome, warning: 'no_lead_found' });
  }

  const { data: lead } = await supabase
    .from('pipeline_leads')
    .select('email, first_name, company_name, instantly_campaign_id')
    .eq('id', leadId)
    .single();

  const leadEmail = lead?.email || null;

  // 5. Log voice activity to Close CRM
  if (leadEmail) {
    const note = transcript
      ? `Voice call (${durationSeconds}s) — ${outcome}${endedReason ? ` [${endedReason}]` : ''}\n\nTranscript:\n${transcript.slice(0, 2000)}`
      : `Voice call (${durationSeconds}s) — ${outcome}${endedReason ? ` [${endedReason}]` : ''}`;

    logActivityToClose({
      type: 'voice_call',
      leadEmail,
      duration: durationSeconds,
      outcome,
      note,
    }).catch(console.error);

    // 6. If interested or meeting_booked, update CRM status
    if (isPositive) {
      markInterestedInCrm({
        email: leadEmail,
        company: lead?.company_name,
        lead_name: lead?.first_name,
        reply_summary: `Voice call: prospect ${outcome === 'meeting_booked' ? 'booked a meeting' : 'expressed interest'} (${durationSeconds}s call)`,
      }).catch(console.error);
    }
  }

  // 6.5. Send follow-up email with Calendly link after positive voice call
  if (isPositive && leadEmail && lead?.instantly_campaign_id) {
    const calendlyLink = process.env.CALENDLY_LINK;
    if (calendlyLink) {
      const firstName = lead?.first_name || '';
      const followUp = outcome === 'meeting_booked'
        ? `${firstName ? `Hey ${firstName}, g` : 'G'}reat speaking with you. Here's the link to lock in a time: ${calendlyLink}`
        : `${firstName ? `Hey ${firstName}, g` : 'G'}ood chatting just now. If you want to continue the conversation, grab a time here: ${calendlyLink}`;

      sendReply(lead.instantly_campaign_id, leadEmail, followUp).catch((err) => {
        console.error('[vapi-webhook] Follow-up email failed:', err);
      });
    }
  }

  // 7. Feed into conversations/reply engine (if meaningful transcript)
  if (transcript.trim() && outcome !== 'no_answer' && outcome !== 'voicemail') {
    routeInboundReply({
      leadId,
      channel: 'voice',
      replyText: transcript,
    }).catch(console.error);
  }

  // 8. Lead status actions
  if (outcome === 'not_interested') {
    await supabase
      .from('pipeline_leads')
      .update({ status: 'opted_out', updated_at: new Date().toISOString() })
      .eq('id', leadId);
  }

  // 9. Schedule callback if requested (2 days later)
  if (outcome === 'callback_requested') {
    const callbackAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('voice_calls').insert({
      lead_id: leadId,
      phone_number: voiceCall?.phone_number,
      status: 'scheduled',
      called_at: callbackAt,
    }).then(null, console.error);
  }

  return NextResponse.json({ ok: true, outcome });
}
