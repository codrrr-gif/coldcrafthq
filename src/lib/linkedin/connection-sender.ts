// src/lib/linkedin/connection-sender.ts
// Sends LinkedIn connection requests and DM follow-ups for pipeline leads.

import { sendConnectionRequest, sendLinkedInDM } from './heyreach-client';
import { supabase } from '@/lib/supabase/client';
import type { PipelineLead } from '@/lib/gtm/types';

export async function sendLinkedInConnect(lead: PipelineLead): Promise<boolean> {
  if (!lead.linkedin_url) return false;
  if (!process.env.HEYREACH_API_KEY) return false;

  const opener = lead.personalized_opener || `saw ${lead.company_name} is growing — thought it'd be worth connecting.`;
  const note = `Hi ${lead.first_name}, ${opener}`.slice(0, 300);

  const result = await sendConnectionRequest(lead.linkedin_url, note);

  const { error: tpError } = await supabase.from('touchpoints').insert({
    lead_id: lead.id,
    channel: 'linkedin',
    touch_type: 'linkedin_connect',
    status: result.success ? 'sent' : 'failed',
    content: note,
  });
  if (tpError) console.error('[linkedin] touchpoint insert error:', tpError);

  if (!result.success) {
    console.error(`[linkedin] Connect failed for ${lead.id}: ${result.error}`);
  }
  return result.success;
}

export async function sendFollowUpDM(lead: PipelineLead): Promise<boolean> {
  if (!lead.linkedin_url) return false;
  if (!process.env.HEYREACH_API_KEY) return false;

  const message = `Hi ${lead.first_name}, sent you an email about ${lead.company_name} a few days ago — just wanted to make sure it didn't get buried. Happy to share more context if useful.`;

  const result = await sendLinkedInDM(lead.linkedin_url, message);

  const { error: tpError } = await supabase.from('touchpoints').insert({
    lead_id: lead.id,
    channel: 'linkedin',
    touch_type: 'linkedin_dm',
    status: result.success ? 'sent' : 'failed',
    content: message,
  });
  if (tpError) console.error('[linkedin] touchpoint insert error:', tpError);

  if (!result.success) {
    console.error(`[linkedin] DM failed for ${lead.id}: ${result.error}`);
  }
  return result.success;
}
