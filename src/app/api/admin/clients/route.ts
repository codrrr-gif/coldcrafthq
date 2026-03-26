import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getStripe } from '@/lib/portal/stripe';
import { notifySlack } from '@/lib/slack';

export const dynamic = 'force-dynamic';

// GET: List all clients
export async function GET() {
  const { data } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  return NextResponse.json({ clients: data || [] });
}

// POST: Create a new client
export async function POST(req: NextRequest) {
  const { name, billing_email, monthly_retainer, admin_email } = await req.json();

  if (!name?.trim() || !billing_email?.trim() || !monthly_retainer) {
    return NextResponse.json({ error: 'name, billing_email, and monthly_retainer are required' }, { status: 400 });
  }

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Create Stripe customer + subscription
  let stripeCustomerId: string | null = null;
  let stripeSubscriptionId: string | null = null;

  try {
    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email: billing_email.trim(),
      name: name.trim(),
      metadata: { source: 'coldcraft-portal' },
    });
    stripeCustomerId = customer.id;

    // Create a price for this client's retainer
    const price = await stripe.prices.create({
      unit_amount: monthly_retainer,
      currency: 'usd',
      recurring: { interval: 'month' },
      product_data: { name: `ColdCraft Outbound — ${name.trim()}` },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      collection_method: 'send_invoice',
      days_until_due: 7,
    });
    stripeSubscriptionId = subscription.id;
  } catch (err) {
    console.error('[admin] Stripe setup failed:', err);
    // Continue without Stripe — can be configured later
  }

  // Create client record
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      name: name.trim(),
      slug,
      billing_email: billing_email.trim(),
      monthly_retainer,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      status: 'onboarding',
    })
    .select()
    .single();

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }

  // Create client user (owner, no password yet — needs invitation acceptance)
  await supabase.from('client_users').insert({
    client_id: client.id,
    email: billing_email.trim().toLowerCase(),
    name: name.trim(),
    role: 'owner',
  });

  // Assign admin contact
  if (admin_email) {
    await supabase.from('client_contacts').insert({
      client_id: client.id,
      admin_email: admin_email.trim(),
    });
  }

  notifySlack(`New client created: ${name} ($${(monthly_retainer / 100).toLocaleString()}/mo)`, 'info').catch(() => {});

  return NextResponse.json({ client }, { status: 201 });
}
