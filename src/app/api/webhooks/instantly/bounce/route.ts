// ============================================
// Instantly Bounce Webhook
// ============================================
// Captures hard and soft bounces from Instantly campaigns.
// Every bounce recorded here improves future verification accuracy.
//
// Set this URL in Instantly: Settings → Webhooks → Bounce Events
// URL: https://coldcrafthq.com/api/webhooks/instantly/bounce
//
// Expected payload (Instantly bounce event):
// {
//   "event": "email_bounced",
//   "campaign_id": "...",
//   "lead_email": "...",
//   "bounce_type": "hard" | "soft",
//   "bounce_message": "550 5.1.1 The email account does not exist",
//   "bounce_code": "550"
// }

import { NextRequest, NextResponse } from 'next/server';
import { recordEmailOutcome } from '@/lib/verify/outcomes-db';
import { requireSecret } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Auth is mandatory — reject if secret not configured
    const authErr = requireSecret(req);
    if (authErr) return authErr;

    const payload = await req.json();

    // Normalize field names — Instantly may vary these across versions
    const leadEmail = (
      payload.lead_email ||
      payload.email ||
      payload.to_email ||
      payload.recipient
    )?.toLowerCase()?.trim();

    const campaignId = payload.campaign_id || payload.campaignId || null;

    const bounceType = (
      payload.bounce_type ||
      payload.bounceType ||
      payload.type ||
      'hard'
    ).toLowerCase();

    const bounceMessage = payload.bounce_message || payload.message || null;
    const bounceCode = payload.bounce_code || payload.code || null;

    if (!leadEmail || !leadEmail.includes('@')) {
      return NextResponse.json({ error: 'Missing or invalid lead_email' }, { status: 400 });
    }

    // hard bounce = permanent (550, user doesn't exist)
    // soft bounce = temporary (421, 450, full inbox, server down)
    const outcome = bounceType === 'soft' ? 'soft_bounce' : 'hard_bounce';

    await recordEmailOutcome(leadEmail, outcome, {
      campaign_id: campaignId,
      bounce_message: bounceMessage,
      bounce_code: String(bounceCode || ''),
      source: 'instantly',
    });

    console.log(`Bounce recorded: ${leadEmail} → ${outcome}`);

    // Cross-system blocklist: block in Instantly + update Close
    // Note: `outcome` is the mapped value ('hard_bounce'), `bounceType` is raw ('hard')
    if (outcome === 'hard_bounce' && leadEmail) {
      // Block in Instantly
      const { blockEmail } = await import('@/lib/instantly');
      blockEmail(leadEmail).catch((err: unknown) =>
        console.error('[bounce] Instantly block failed:', err)
      );

      // Update Close CRM — mark as Bad Fit + add note
      const { findLeadByEmail, updateLead, addNoteToLead, getLeadStatuses } = await import('@/lib/crm/close-client');
      const { logActivityToClose } = await import('@/lib/crm/close-sync');

      (async () => {
        const lead = await findLeadByEmail(leadEmail);
        if (!lead) return;

        const statuses = await getLeadStatuses();
        const badFit = statuses.find((s) => s.label === 'Bad Fit');
        if (badFit) await updateLead(lead.id, { status_id: badFit.id });

        await addNoteToLead(lead.id, `[BOUNCE] Hard bounce — email blocked across Instantly and Close`);
        await logActivityToClose({ type: 'bounce', leadEmail, note: `Hard bounce for ${leadEmail}` });
      })().catch((err) => console.error('[bounce] Close sync failed:', err));
    }

    return NextResponse.json({ success: true, email: leadEmail, outcome });
  } catch (err) {
    console.error('Bounce webhook error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
