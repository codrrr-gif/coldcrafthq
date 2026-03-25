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

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.CALENDLY_SIGNING_SECRET;
  if (!secret) {
    console.error('[auth] No CALENDLY_SIGNING_SECRET configured');
    return false; // reject if secret not configured
  }
  if (!signature) return false;

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
    const scheduledEvent = (resource?.event || resource?.scheduled_event) as Record<string, unknown> | undefined;
    const eventStartTime = scheduledEvent?.start_time as string | undefined;

    if (!email) {
      return NextResponse.json({ error: 'No email in payload' }, { status: 400 });
    }

    // Look up pipeline_lead for signal context
    const { data: pipelineLead } = await supabase
      .from('pipeline_leads')
      .select('id, signal_score, signal_type, signal_summary, instantly_campaign_id, research_summary, company_name, title')
      .eq('email', email)
      .single();

    // Calculate MRR potential from signal score
    const signalScore = pipelineLead?.signal_score || 0;
    const mrrPotential = signalScore >= 80 ? 5000 : signalScore >= 60 ? 2000 : 1000;
    const annualValue = mrrPotential * 12;

    // Update pipeline_lead status
    if (pipelineLead) {
      await supabase
        .from('pipeline_leads')
        .update({ status: 'meeting', updated_at: new Date().toISOString() })
        .eq('id', pipelineLead.id);
    }

    // Create enriched opportunity in Close
    const { createOpportunityInCrm, logActivityToClose } = await import('@/lib/crm/close-sync');
    const { findLeadByEmail, updateLead, createTask, getCurrentUser, addNoteToLead, CLOSE_CUSTOM_FIELDS } = await import('@/lib/crm/close-client');

    (async () => {
      // Create opportunity via standard hook (accepts { email, company?, lead_name? })
      await createOpportunityInCrm({
        email,
        company: pipelineLead?.company_name || name,
        lead_name: name,
      });

      // Find lead and add enriched signal context note
      const lead = await findLeadByEmail(email);
      if (lead) {
        const signalNote = [
          `Signal: ${pipelineLead?.signal_type || 'unknown'} (score: ${signalScore})`,
          `Campaign: ${pipelineLead?.instantly_campaign_id || 'N/A'}`,
          `MRR Potential: $${mrrPotential}/mo (annual: $${annualValue})`,
          pipelineLead?.research_summary ? `Research: ${pipelineLead.research_summary.substring(0, 300)}` : '',
        ].filter(Boolean).join('\n');
        await addNoteToLead(lead.id, signalNote);
      }

      // Update custom fields
      const leadForFields = lead || await findLeadByEmail(email);
      if (leadForFields) {
        await updateLead(leadForFields.id, {
          [CLOSE_CUSTOM_FIELDS.signal_summary]: pipelineLead?.signal_summary || '',
        });

        // Create prep task
        if (eventStartTime) {
          const prepTime = new Date(new Date(eventStartTime).getTime() - 60 * 60 * 1000);
          const user = await getCurrentUser().catch(() => null);
          await createTask(leadForFields.id, {
            text: `Prep for discovery call with ${name}${pipelineLead?.company_name ? ' at ' + pipelineLead.company_name : ''}`,
            due_date: prepTime.toISOString().split('T')[0],
            assigned_to: user?.id,
          });
        }
      }

      // Log activity
      await logActivityToClose({
        type: 'meeting_booked',
        leadEmail: email,
        note: `Calendly booking — ${name} — MRR potential: $${mrrPotential}/mo`,
      });
    })().catch((err) => console.error('[calendly] Enrichment failed:', err));

    return NextResponse.json({ status: 'meeting_booked', email, mrr_potential: mrrPotential });
  }

  if (event === 'invitee.canceled') {
    console.log(`[Calendly] Meeting canceled: ${email}`);
  }

  return NextResponse.json({ ok: true });
}
