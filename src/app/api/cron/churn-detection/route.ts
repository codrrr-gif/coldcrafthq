import { NextRequest, NextResponse } from 'next/server';
import { requireSecret } from '@/lib/auth/api-auth';
import { supabase } from '@/lib/supabase/client';
import { notifySlack, notifyCronFailure } from '@/lib/slack';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authErr = requireSecret(req);
  if (authErr) return authErr;

  try {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .eq('status', 'active');

    if (!clients?.length) return NextResponse.json({ message: 'No active clients' });

    const alerts: string[] = [];

    for (const client of clients) {
      const flags: string[] = [];

      // Check: no login in 14 days
      const { data: users } = await supabase
        .from('client_users')
        .select('last_login_at')
        .eq('client_id', client.id)
        .order('last_login_at', { ascending: false })
        .limit(1);

      const lastLogin = users?.[0]?.last_login_at;
      if (!lastLogin || lastLogin < fourteenDaysAgo) {
        flags.push('No login in 14+ days');
      }

      // Check: no meetings in 14 days
      const { count: recentMeetings } = await supabase
        .from('meetings')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .gte('created_at', fourteenDaysAgo);

      if (!recentMeetings || recentMeetings === 0) {
        flags.push('No meetings booked in 14 days');
      }

      // Check: overdue invoices
      const { count: overdue } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('status', 'overdue');

      if (overdue && overdue > 0) {
        flags.push('Overdue invoice');
      }

      // Check: pause/cancel request
      const { count: pauseReqs } = await supabase
        .from('client_requests')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('type', 'pause_campaign')
        .eq('status', 'pending');

      if (pauseReqs && pauseReqs > 0) {
        flags.push('Pending pause request');
      }

      if (flags.length > 0) {
        alerts.push(`${client.name}: ${flags.join(', ')}`);
      }
    }

    if (alerts.length > 0) {
      await notifySlack(`Churn risk detected:\n${alerts.map((a) => `- ${a}`).join('\n')}`, 'warning');
    }

    return NextResponse.json({ clients_checked: clients.length, alerts_triggered: alerts.length, alerts });
  } catch (err) {
    notifyCronFailure('churn-detection', err).catch(() => {});
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
