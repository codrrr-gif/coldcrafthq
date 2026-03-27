import { supabase } from '@/lib/supabase/client';
import type { ReportMetrics } from './types';

export async function gatherMetrics(
  clientId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<ReportMetrics> {
  const startISO = periodStart.toISOString();
  const endISO = periodEnd.toISOString();

  const [replies, meetings, health, client] = await Promise.all([
    supabase.from('replies').select('id, category, confidence', { count: 'exact' }).eq('client_id', clientId).gte('created_at', startISO).lt('created_at', endISO),
    supabase.from('meetings').select('id', { count: 'exact' }).eq('client_id', clientId).gte('created_at', startISO).lt('created_at', endISO),
    supabase.from('account_health_snapshots').select('health_score').eq('client_id', clientId).order('snapshot_date', { ascending: false }).limit(1).single(),
    supabase.from('clients').select('monthly_retainer').eq('id', clientId).single(),
  ]);

  const totalReplies = replies.count || 0;
  const interested = (replies.data || []).filter((r) => r.category === 'interested').length;
  const replyRate = totalReplies > 0 ? Math.round((interested / totalReplies) * 100) : 0;
  const meetingsBooked = meetings.count || 0;
  const retainer = client.data?.monthly_retainer || 0;
  const costPerMeeting = meetingsBooked > 0 ? Math.round(retainer / meetingsBooked) : 0;
  const avgConf = (() => {
    const c = (replies.data || []).map((r) => r.confidence).filter(Boolean);
    return c.length > 0 ? Math.round((c.reduce((a: number, b: number) => a + b, 0) / c.length) * 100) : 0;
  })();

  return {
    leads_contacted: totalReplies,
    reply_rate: replyRate,
    meetings_booked: meetingsBooked,
    pipeline_value: 0,
    cost_per_meeting: costPerMeeting,
    campaign_health: health.data?.health_score || 0,
    ai_confidence_avg: avgConf,
  };
}
