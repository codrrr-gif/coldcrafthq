import { NextRequest, NextResponse } from 'next/server';
import { requireSecret } from '@/lib/auth/api-auth';
import { supabase } from '@/lib/supabase/client';
import { gatherMetrics } from '@/lib/portal/report-metrics';
import { insertActivity } from '@/lib/portal/activity';
import { notifyCronFailure } from '@/lib/slack';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authErr = requireSecret(req);
  if (authErr) return authErr;

  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, billing_email, portal_name')
      .eq('status', 'active');

    if (!clients?.length) {
      return NextResponse.json({ message: 'No active clients' });
    }

    const results = [];

    for (const client of clients) {
      const metrics = await gatherMetrics(client.id, weekAgo, now);

      // Store report
      await supabase.from('reports').insert({
        client_id: client.id,
        type: 'weekly',
        period_start: weekAgo.toISOString().split('T')[0],
        period_end: now.toISOString().split('T')[0],
        metrics,
      });

      insertActivity(client.id, 'report_generated', `Weekly report generated — ${metrics.meetings_booked} meetings booked`).catch(() => {});

      // TODO: Send email via Resend when RESEND_API_KEY is configured
      results.push({ client: client.name, meetings: metrics.meetings_booked });
    }

    return NextResponse.json({ reports_generated: results.length, results });
  } catch (err) {
    notifyCronFailure('weekly-report', err).catch(() => {});
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
