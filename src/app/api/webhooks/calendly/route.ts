// ============================================
// Calendly Webhook
// ============================================
// Fired when: invitee.created (meeting booked) or invitee.canceled
//
// Setup: In Calendly → Integrations → Webhooks
//   URL: https://coldcrafthq.com/api/webhooks/calendly
//   Events: invitee.created, invitee.canceled
//   Signing key: set as CALENDLY_SIGNING_SECRET env var
//
// On booking: updates pipeline_lead status → 'meeting',
//             creates Close CRM opportunity (fire-and-forget)

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabase } from '@/lib/supabase/client';
import { createOpportunityInCrm } from '@/lib/crm/close-sync';

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.CALENDLY_SIGNING_SECRET;
  if (!secret || !signature) return !secret; // if no secret, allow through

  try {
    const expected = createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return `sha256=${expected}` === signature;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('calendly-webhook-signature');

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = payload.event as string;
  const resource = payload.payload as Record<string, unknown> | undefined;

  if (!resource) {
    return NextResponse.json({ ok: true });
  }

  // Extract invitee email
  const invitee = resource.invitee as Record<string, unknown> | undefined;
  const email = invitee?.email as string | undefined;
  const name = invitee?.name as string | undefined;

  if (!email) {
    return NextResponse.json({ ok: true });
  }

  if (event === 'invitee.created') {
    // Update pipeline_lead status → 'meeting'
    await supabase
      .from('pipeline_leads')
      .update({ status: 'pushed', updated_at: new Date().toISOString() })
      .eq('email', email.toLowerCase());

    // Update company status if we can find it
    const { data: lead } = await supabase
      .from('pipeline_leads')
      .select('company_domain')
      .eq('email', email.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lead?.company_domain) {
      await supabase
        .from('companies')
        .update({ status: 'meeting', updated_at: new Date().toISOString() })
        .eq('domain', lead.company_domain);
    }

    // Create opportunity in Close CRM
    createOpportunityInCrm({
      email,
      lead_name: name,
    }).catch(console.error);

    console.log(`[Calendly] Meeting booked: ${email}`);
  }

  if (event === 'invitee.canceled') {
    console.log(`[Calendly] Meeting canceled: ${email}`);
    // Optional: revert status back to 'replied' or add a note
  }

  return NextResponse.json({ ok: true });
}
