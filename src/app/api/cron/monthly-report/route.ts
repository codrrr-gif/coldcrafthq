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
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, billing_email, portal_name')
      .eq('status', 'active');

    if (!clients?.length) {
      return NextResponse.json({ message: 'No active clients' });
    }

    const results = [];

    for (const client of clients) {
      const metrics = await gatherMetrics(client.id, monthAgo, now);

      await supabase.from('reports').insert({
        client_id: client.id,
        type: 'monthly',
        period_start: monthAgo.toISOString().split('T')[0],
        period_end: now.toISOString().split('T')[0],
        metrics,
      });

      insertActivity(client.id, 'report_generated', `Monthly report generated — ${metrics.meetings_booked} meetings booked`).catch(() => {});

      results.push({ client: client.name, meetings: metrics.meetings_booked });
    }

    return NextResponse.json({ reports_generated: results.length, results });
  } catch (err) {
    notifyCronFailure('monthly-report', err).catch(() => {});
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
