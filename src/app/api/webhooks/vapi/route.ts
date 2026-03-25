// src/app/api/webhooks/vapi/route.ts
// Receives call completion events from Vapi (end-of-call-report).

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { requireVapiSecret } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Auth is mandatory — reject if secret not configured
  const authErr = requireVapiSecret(req);
  if (authErr) return authErr;

  const body = await req.json() as { message?: { type?: string; call?: { id?: string }; transcript?: string; durationSeconds?: number } };
  const { message } = body;

  if (message?.type !== 'end-of-call-report') {
    return NextResponse.json({ ok: true });
  }

  const callId = message.call?.id;
  if (!callId) return NextResponse.json({ ok: true });

  const transcript = message.transcript || '';
  const durationSeconds = message.durationSeconds || 0;

  // Classify outcome from transcript
  let outcome: string = 'no_answer';
  const t = transcript.toLowerCase();
  if (t.includes('interested') || t.includes('tell me more') || t.includes('sounds good') || t.includes('let\'s connect')) {
    outcome = 'interested';
  } else if (t.includes('not interested') || t.includes('remove me') || t.includes('do not call')) {
    outcome = 'not_interested';
  } else if (t.includes('call me back') || t.includes('try again') || t.includes('better time')) {
    outcome = 'callback_requested';
  } else if (durationSeconds < 5) {
    outcome = 'no_answer';
  } else if (durationSeconds < 20) {
    outcome = 'voicemail';
  }

  await supabase.from('voice_calls').update({
    status: 'completed',
    duration_s: durationSeconds,
    transcript,
    outcome,
    ended_at: new Date().toISOString(),
  }).eq('vapi_call_id', callId);

  // Update touchpoint status
  await supabase.from('touchpoints').update({
    status: 'delivered',
    replied_at: outcome === 'interested' ? new Date().toISOString() : null,
  }).eq('external_id', callId);

  // Suppress lead from further outreach if not interested
  if (outcome === 'not_interested' || outcome === 'do_not_call') {
    const { data: voiceCall } = await supabase
      .from('voice_calls')
      .select('lead_id')
      .eq('vapi_call_id', callId)
      .single();

    if (voiceCall?.lead_id) {
      await supabase
        .from('pipeline_leads')
        .update({ status: 'opted_out', updated_at: new Date().toISOString() })
        .eq('id', voiceCall.lead_id);
    }
  }

  return NextResponse.json({ ok: true });
}
