import { NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal/auth';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  const { session, error } = await requirePortalSession();
  if (error) return error;

  const clientId = session.clientId;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Parallel queries
  const [
    repliesWeek,
    repliesMonth,
    repliesPrevWeek,
    meetingsMonth,
    meetingsPrevMonth,
    healthSnap,
    clientData,
  ] = await Promise.all([
    supabase.from('replies').select('id, category, confidence', { count: 'exact' }).eq('client_id', clientId).gte('created_at', weekAgo),
    supabase.from('replies').select('id, category', { count: 'exact' }).eq('client_id', clientId).gte('created_at', monthAgo),
    supabase.from('replies').select('id, category', { count: 'exact' }).eq('client_id', clientId).gte('created_at', twoWeeksAgo).lt('created_at', weekAgo),
    supabase.from('meetings').select('id', { count: 'exact' }).eq('client_id', clientId).gte('created_at', monthAgo),
    supabase.from('meetings').select('id', { count: 'exact' }).eq('client_id', clientId).gte('created_at', new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()).lt('created_at', monthAgo),
    supabase.from('account_health_snapshots').select('health_score, reply_rate, bounce_rate').eq('client_id', clientId).order('snapshot_date', { ascending: false }).limit(1).single(),
    supabase.from('clients').select('monthly_retainer').eq('id', clientId).single(),
  ]);

  const leadsContactedWeek = repliesWeek.count || 0;
  const leadsContactedMonth = repliesMonth.count || 0;
  const meetingsBooked = meetingsMonth.count || 0;
  const prevMeetings = meetingsPrevMonth.count || 0;
  const retainer = clientData.data?.monthly_retainer || 0;

  // Reply rate: interested replies / total replies this week
  const interestedWeek = (repliesWeek.data || []).filter((r) => r.category === 'interested').length;
  const replyRate = leadsContactedWeek > 0 ? interestedWeek / leadsContactedWeek : 0;

  const prevTotal = repliesPrevWeek.count || 0;
  const prevInterested = (repliesPrevWeek.data || []).filter((r) => r.category === 'interested').length;
  const prevReplyRate = prevTotal > 0 ? prevInterested / prevTotal : 0;

  const costPerMeeting = meetingsBooked > 0 ? retainer / meetingsBooked : 0;

  const avgConfidence = (() => {
    const confs = (repliesWeek.data || []).map((r) => r.confidence).filter(Boolean);
    return confs.length > 0 ? confs.reduce((a, b) => a + b, 0) / confs.length : 0;
  })();

  return NextResponse.json({
    leads_contacted_week: leadsContactedWeek,
    leads_contacted_month: leadsContactedMonth,
    reply_rate: Math.round(replyRate * 100),
    reply_rate_trend: replyRate - prevReplyRate,
    meetings_booked: meetingsBooked,
    meetings_trend: meetingsBooked - prevMeetings,
    pipeline_value: 0, // populated later from Close CRM
    cost_per_meeting: Math.round(costPerMeeting),
    campaign_health: healthSnap.data?.health_score || 0,
    bounce_rate: healthSnap.data?.bounce_rate || 0,
    ai_confidence: Math.round(avgConfidence * 100),
  });
}
