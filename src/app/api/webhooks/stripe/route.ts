import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/portal/stripe';
import { supabase } from '@/lib/supabase/client';
import { insertActivity } from '@/lib/portal/activity';
import { notifySlack } from '@/lib/slack';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error('[stripe] Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'invoice.created': {
      const invoice = event.data.object;
      const customerId = invoice.customer as string;

      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (client) {
        await supabase.from('invoices').insert({
          client_id: client.id,
          stripe_invoice_id: invoice.id,
          amount: invoice.amount_due,
          status: 'open',
          period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
          period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
          pdf_url: invoice.invoice_pdf || null,
        });
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString(), pdf_url: invoice.invoice_pdf || null })
        .eq('stripe_invoice_id', invoice.id);

      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('stripe_customer_id', invoice.customer as string)
        .single();

      if (client) {
        insertActivity(client.id, 'system', `Invoice paid — $${(invoice.amount_paid / 100).toFixed(2)}`).catch(() => {});
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await supabase
        .from('invoices')
        .update({ status: 'overdue' })
        .eq('stripe_invoice_id', invoice.id);

      const { data: client } = await supabase
        .from('clients')
        .select('id, name')
        .eq('stripe_customer_id', invoice.customer as string)
        .single();

      if (client) {
        notifySlack(`Payment failed for ${client.name} — invoice ${invoice.id}`, 'error').catch(() => {});
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const { data: client } = await supabase
        .from('clients')
        .select('id, name')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (client) {
        await supabase.from('clients').update({ status: 'churned', updated_at: new Date().toISOString() }).eq('id', client.id);
        notifySlack(`Client ${client.name} subscription canceled — marked as churned`, 'error').catch(() => {});
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
