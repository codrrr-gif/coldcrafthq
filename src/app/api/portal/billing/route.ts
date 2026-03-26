import { NextResponse } from 'next/server';
import { requirePortalSession, hasRole } from '@/lib/portal/auth';
import { supabase } from '@/lib/supabase/client';
import { getStripe } from '@/lib/portal/stripe';

export async function GET() {
  const { session, error } = await requirePortalSession();
  if (error) return error;

  if (!hasRole(session, 'owner')) {
    return NextResponse.json({ error: 'Owner role required' }, { status: 403 });
  }

  const { data: client } = await supabase
    .from('clients')
    .select('monthly_retainer, stripe_customer_id, stripe_subscription_id')
    .eq('id', session.clientId)
    .single();

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', session.clientId)
    .order('created_at', { ascending: false })
    .limit(50);

  let subscription = null;
  let portalUrl = null;

  if (client?.stripe_subscription_id) {
    try {
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(client.stripe_subscription_id);
      subscription = {
        status: sub.status,
        current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
      };

      if (client.stripe_customer_id) {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: client.stripe_customer_id,
          return_url: `${process.env.PORTAL_URL || 'https://www.coldcrafthq.com/portal'}/billing`,
        });
        portalUrl = portalSession.url;
      }
    } catch (err) {
      console.error('[billing] Stripe error:', err);
    }
  }

  return NextResponse.json({
    monthly_retainer: client?.monthly_retainer || 0,
    subscription,
    portal_url: portalUrl,
    invoices: invoices || [],
  });
}
