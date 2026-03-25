// src/lib/crm/close-sync.ts
// ============================================
// ColdCraft ↔ Close CRM sync layer
//
// 3 lifecycle hooks:
// 1. syncLeadToCrm     → called after Instantly push (new lead)
// 2. markInterestedInCrm → called when reply classified as "interested"
// 3. createOpportunityInCrm → called when meeting booked
// ============================================

import {
  findLeadByEmail,
  createLead,
  addNoteToLead,
  logEmail,
  logCall,
  createOpportunity,
  getOpportunityStatuses,
  updateLead,
  getLeadStatuses,
  CLOSE_CUSTOM_FIELDS,
} from './close-client';

// ── 1. Sync new lead to Close ────────────────────────────────────────────────
// Called after pipeline pushes lead to Instantly.
// Creates company + contact in Close (skips if already exists).

export async function syncLeadToCrm(params: {
  email: string;
  first_name: string;
  last_name: string;
  title?: string | null;
  company_name?: string | null;
  company_domain?: string;
  signal_type?: string | null;
  signal_summary?: string | null;
  campaign_id?: string | null;
  email_found_via?: string | null;
}): Promise<string | null> {
  if (!process.env.CLOSE_CRM_API_KEY) return null;

  try {
    const { email, first_name, last_name, title, company_name, company_domain, signal_type, signal_summary, campaign_id, email_found_via } = params;

    // Check if contact already exists in Close
    const existing = await findLeadByEmail(email);
    if (existing) return existing.id;

    const leadName = company_name || company_domain || `${first_name} ${last_name}`;

    // Build custom fields payload
    const custom: Record<string, string> = {
      [CLOSE_CUSTOM_FIELDS.coldcraft_source]: 'ColdCraft Pipeline',
    };
    if (signal_type)    custom[CLOSE_CUSTOM_FIELDS.signal_type]        = signal_type;
    if (signal_summary) custom[CLOSE_CUSTOM_FIELDS.signal_summary]     = signal_summary.slice(0, 255);
    if (campaign_id)    custom[CLOSE_CUSTOM_FIELDS.instantly_campaign]  = campaign_id;
    if (email_found_via) custom[CLOSE_CUSTOM_FIELDS.email_found_via]   = email_found_via;

    const lead = await createLead(
      leadName,
      {
        name: `${first_name} ${last_name}`.trim(),
        title: title || undefined,
        emails: [{ email, type: 'office' }],
      },
      {
        status_label: 'Cold Outreach',
        custom,
      }
    );

    // Add context note
    const note = signal_type
      ? `ColdCraft signal: ${signal_type}${signal_summary ? ` — ${signal_summary}` : ''}`
      : 'Pushed via ColdCraft pipeline';
    await addNoteToLead(lead.id, note).catch(console.error);

    return lead.id;
  } catch (err) {
    console.error('[CRM] syncLeadToCrm failed:', err);
    return null;
  }
}

// ── 2. Mark lead as interested ───────────────────────────────────────────────
// Called when Instantly webhook receives an "interested" reply.
// Adds a high-priority note to the Close lead.

export async function markInterestedInCrm(params: {
  email: string;
  company?: string | null;
  lead_name?: string | null;
  reply_summary?: string;
}): Promise<void> {
  if (!process.env.CLOSE_CRM_API_KEY) return;

  try {
    const { email, company, lead_name, reply_summary } = params;

    let lead = await findLeadByEmail(email);

    // Create the lead if it doesn't exist yet (e.g. manual campaign)
    if (!lead) {
      const name = lead_name || email;
      lead = await createLead(
        company || name,
        { name, emails: [{ email, type: 'office' }] },
        { status_label: 'Interested' }
      );
    } else {
      // Move existing lead to "Interested" status
      const statuses = await getLeadStatuses();
      const interestedStatus = statuses.find((s) => s.label === 'Interested');
      if (interestedStatus) {
        await updateLead(lead.id, { status_id: interestedStatus.id }).catch(console.error);
      }
    }

    const note = `INTERESTED REPLY received via ColdCraft.\n${
      reply_summary ? `Summary: ${reply_summary}` : 'Lead replied positively to cold email.'
    }\n\nAction needed: Follow up within 24 hours.`;

    await addNoteToLead(lead.id, note);
  } catch (err) {
    console.error('[CRM] markInterestedInCrm failed:', err);
  }
}

// ── 3. Create opportunity on meeting booked ──────────────────────────────────
// Called when a reply is manually marked as "meeting booked".
// Finds or creates the Close lead and attaches an opportunity.

export async function createOpportunityInCrm(params: {
  email: string;
  company?: string | null;
  lead_name?: string | null;
}): Promise<void> {
  if (!process.env.CLOSE_CRM_API_KEY) return;

  try {
    const { email, company, lead_name } = params;

    let lead = await findLeadByEmail(email);

    if (!lead) {
      const name = lead_name || email;
      lead = await createLead(
        company || name,
        { name, emails: [{ email, type: 'office' }] },
        { status_label: 'Meeting Booked' }
      );
    } else {
      // Move lead to "Meeting Booked" status
      const leadStatuses = await getLeadStatuses();
      const meetingStatus = leadStatuses.find((s) => s.label === 'Meeting Booked');
      if (meetingStatus) {
        await updateLead(lead.id, { status_id: meetingStatus.id }).catch(console.error);
      }
    }

    // Find "Discovery Call" opportunity status (first active stage)
    const statuses = await getOpportunityStatuses();
    const activeStatus = statuses.find((s) => s.label === 'Discovery Call') || statuses.find((s) => s.type === 'active');
    if (!activeStatus) {
      // Can't create opportunity without a status — just add a note
      await addNoteToLead(lead.id, 'MEETING BOOKED via ColdCraft. Create opportunity manually.');
      return;
    }

    await createOpportunity(
      lead.id,
      activeStatus.id,
      'Meeting booked via ColdCraft cold email campaign.'
    );

    await addNoteToLead(lead.id, 'Meeting booked — opportunity created automatically via ColdCraft.');
  } catch (err) {
    console.error('[CRM] createOpportunityInCrm failed:', err);
  }
}

// ── Activity Timeline Enrichment ─────────────────────────────────────────
// Logs Instantly touchpoints as Close CRM activities (fire-and-forget).

type ActivityType =
  | 'email_sent' | 'email_replied' | 'voice_call'
  | 'linkedin_connect' | 'linkedin_dm' | 'bounce' | 'meeting_booked';

interface LogActivityParams {
  type: ActivityType;
  leadEmail: string;
  subject?: string;
  body?: string;
  direction?: 'outgoing' | 'incoming';
  duration?: number;
  outcome?: string;
  note?: string;
}

export async function logActivityToClose(params: LogActivityParams): Promise<void> {
  try {
    const lead = await findLeadByEmail(params.leadEmail);
    if (!lead) return; // No Close lead found, skip silently

    switch (params.type) {
      case 'email_sent':
        await logEmail(lead.id, {
          direction: 'outgoing',
          subject: params.subject || 'ColdCraft Outbound',
          body_text: params.body || '',
          status: 'sent',
        });
        break;

      case 'email_replied':
        await logEmail(lead.id, {
          direction: 'incoming',
          subject: params.subject || 'Re: ColdCraft Outbound',
          body_text: params.body || '',
          status: 'received',
        });
        break;

      case 'voice_call':
        await logCall(lead.id, {
          direction: 'outgoing',
          duration: params.duration,
          note: params.note || `Voice call — ${params.outcome || 'completed'}`,
          status: params.outcome === 'no_answer' ? 'no-answer'
            : params.outcome === 'voicemail' ? 'voicemail'
            : 'completed',
        });
        break;

      case 'linkedin_connect':
        await addNoteToLead(lead.id, `[LinkedIn] Connection request sent${params.note ? ': ' + params.note : ''}`);
        break;

      case 'linkedin_dm':
        await addNoteToLead(lead.id, `[LinkedIn] DM sent${params.note ? ': ' + params.note : ''}`);
        break;

      case 'bounce':
        await addNoteToLead(lead.id, `[BOUNCE] ${params.note || 'Hard bounce recorded — blocked across systems'}`);
        break;

      case 'meeting_booked':
        await addNoteToLead(lead.id, `[MEETING] ${params.note || 'Meeting booked via ColdCraft'}`);
        break;
    }
  } catch (err) {
    console.error(`[logActivityToClose] Failed for ${params.leadEmail}:`, err);
  }
}
