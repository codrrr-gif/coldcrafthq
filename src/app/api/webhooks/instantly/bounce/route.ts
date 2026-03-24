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

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Validate webhook secret
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${webhookSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

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

    return NextResponse.json({ success: true, email: leadEmail, outcome });
  } catch (err) {
    console.error('Bounce webhook error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
