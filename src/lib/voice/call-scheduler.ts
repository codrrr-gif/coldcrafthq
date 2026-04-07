// src/lib/voice/call-scheduler.ts
// Determines which pushed leads should receive a voice call follow-up.
// Delay is data-driven (passed from timing-optimizer via sequence-runner).
// Only calls if: VAPI_API_KEY is set, lead has phone number, no prior voice touchpoint.

import { supabase } from '@/lib/supabase/client';
import { initiateCall } from './vapi-client';
import { isLeadSuppressed } from '@/lib/orchestrator/lead-suppression';
// trackServiceFailure loaded dynamically to avoid Vercel build cache issue
async function trackServiceFailure(service: string, error: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slack: Record<string, any> = await import('@/lib/slack');
  return slack.trackServiceFailure(service, error);
}

const DAILY_CALL_CAP = 25;
const CONCURRENT_CALLS = 5;

/**
 * @param voiceDelayDays - Days after push to schedule calls. Defaults to 5 for backward compat.
 */
export async function scheduleFollowUpCalls(voiceDelayDays = 5): Promise<number> {
  if (!process.env.VAPI_API_KEY) return 0;

  const windowEndMs = voiceDelayDays * 24 * 60 * 60 * 1000;
  const windowStartMs = (voiceDelayDays - 1) * 24 * 60 * 60 * 1000;
  const windowEnd = new Date(Date.now() - windowEndMs).toISOString();
  const windowStart = new Date(Date.now() - windowStartMs).toISOString();

  // Leads pushed within the voice delay window
  const { data: leads } = await supabase
    .from('pipeline_leads')
    .select('*')
    .eq('status', 'pushed')
    .gte('pushed_at', windowEnd)
    .lt('pushed_at', windowStart)
    .not('first_name', 'is', null)
    .limit(10);

  // Also process scheduled callbacks
  const { data: callbacks } = await supabase
    .from('voice_calls')
    .select('*, pipeline_leads(*)')
    .eq('status', 'scheduled')
    .lte('called_at', new Date().toISOString())
    .limit(5);

  const allLeads = [...(leads || [])];
  const callbackLeadIds = new Set<string>();

  if (callbacks?.length) {
    for (const cb of callbacks) {
      if (cb.pipeline_leads && cb.lead_id) {
        callbackLeadIds.add(cb.lead_id);
        allLeads.push(cb.pipeline_leads);
      }
    }
  }

  if (!allLeads.length) return 0;

  // Daily cap: count calls already made today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: todayCalls } = await supabase
    .from('voice_calls')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString());

  const remaining = Math.max(0, DAILY_CALL_CAP - (todayCalls || 0));
  if (remaining === 0) return 0;

  // Filter eligible leads
  const eligible: Array<{ lead: typeof allLeads[0]; isCallback: boolean; phoneNumber: string }> = [];

  for (const lead of allLeads) {
    if (eligible.length >= remaining) break;

    const isCallback = callbackLeadIds.has(lead.id);

    if (!isCallback) {
      const { count } = await supabase
        .from('touchpoints')
        .select('*', { count: 'exact', head: true })
        .eq('lead_id', lead.id)
        .eq('channel', 'voice');
      if ((count || 0) > 0) continue;
    }
    if (await isLeadSuppressed(lead.id)) continue;

    const phoneNumber = (lead.research_data as Record<string, unknown> | null)?.phone_number as string | undefined;
    if (!phoneNumber) {
      await supabase.from('touchpoints').insert({
        lead_id: lead.id,
        channel: 'voice',
        touch_type: 'voice_call',
        status: 'failed',
        content: 'No phone number available',
      }).then(null, console.error);
      continue;
    }

    eligible.push({ lead, isCallback, phoneNumber });
  }

  // Process in batches of CONCURRENT_CALLS
  let called = 0;

  for (let i = 0; i < eligible.length; i += CONCURRENT_CALLS) {
    const batch = eligible.slice(i, i + CONCURRENT_CALLS);
    const results = await Promise.allSettled(
      batch.map(async ({ lead, isCallback, phoneNumber }) => {
        const result = await initiateCall({
          phoneNumber,
          firstName: lead.first_name || '',
          companyName: lead.company_name || '',
          personalizedContext: lead.personalized_opener || lead.signal_summary || '',
        });

        await supabase.from('voice_calls').insert({
          lead_id: lead.id,
          vapi_call_id: result.callId,
          phone_number: phoneNumber,
          status: 'initiated',
        }).then(null, console.error);

        await supabase.from('touchpoints').insert({
          lead_id: lead.id,
          channel: 'voice',
          touch_type: 'voice_call',
          status: 'sent',
          external_id: result.callId,
          content: isCallback
            ? `Callback: Calling ${lead.first_name} at ${lead.company_name}`
            : `Calling ${lead.first_name} at ${lead.company_name}`,
        }).then(null, console.error);

        if (isCallback) {
          await supabase.from('voice_calls')
            .update({ status: 'initiated', vapi_call_id: result.callId })
            .eq('lead_id', lead.id)
            .eq('status', 'scheduled')
            .then(null, console.error);
        }
      })
    );

    called += results.filter((r) => r.status === 'fulfilled').length;
    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('[voice] Call failed:', r.reason);
        trackServiceFailure('Vapi', r.reason).catch(() => {});
      }
    }
  }

  return called;
}
