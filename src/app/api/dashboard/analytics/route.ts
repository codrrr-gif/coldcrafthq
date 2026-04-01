import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const CLOSE_API = 'https://api.close.com/api/v1';

function closeHeaders() {
  const key = process.env.CLOSE_CRM_API_KEY;
  if (!key) return null;
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30', 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 1. Pipeline funnel from Close
  let funnel: Record<string, number> = {};
  const headers = closeHeaders();
  if (headers) {
    try {
      const query = encodeURIComponent('tag:"ColdCraft"');
      const res = await fetch(`${CLOSE_API}/lead/?query=${query}&_fields=status_label&_limit=200`, { headers });
      if (res.ok) {
        const { data: leads } = await res.json();
        funnel = {};
        for (const lead of leads || []) {
          const status = lead.status_label || 'Unknown';
          funnel[status] = (funnel[status] || 0) + 1;
        }
      }
    } catch {}
  }

  // 2. Revenue attribution by signal type
  const { data: attribution } = await supabase
    .from('revenue_attribution')
    .select('*')
    .gte('created_at', since);

  const signalROI: Record<string, { leads: number; won: number; lost: number; revenue: number }> = {};
  for (const row of attribution || []) {
    const key = row.signal_type || 'unknown';
    if (!signalROI[key]) signalROI[key] = { leads: 0, won: 0, lost: 0, revenue: 0 };
    signalROI[key].leads++;
    if (row.outcome === 'won') {
      signalROI[key].won++;
      signalROI[key].revenue += row.deal_value || 0;
    } else {
      signalROI[key].lost++;
    }
  }

  // 3. Account health snapshots
  const today = new Date().toISOString().split('T')[0];
  const { data: healthData } = await supabase
    .from('account_health_snapshots')
    .select('*')
    .eq('snapshot_date', today)
    .order('health_score', { ascending: true });

  // 4. Active A/B experiments (enriched with computed variant stats)
  const { data: rawExperiments } = await supabase
    .from('ab_experiments')
    .select('*')
    .eq('status', 'active');

  const experiments = await Promise.all(
    (rawExperiments || []).map(async (exp) => {
      const allCampaigns = [exp.base_campaign_id, ...(exp.variant_campaign_ids || [])];
      const variantStats = [];

      for (let i = 0; i < Math.min(allCampaigns.length, 2); i++) {
        const { data: variantLeads } = await supabase
          .from('ab_experiment_leads')
          .select('lead_email')
          .eq('experiment_id', exp.id)
          .eq('variant_index', i);

        const emails = (variantLeads || []).map((l: { lead_email: string }) => l.lead_email);
        let replies = 0;
        let positive = 0;
        if (emails.length > 0) {
          const { count: rc } = await supabase.from('replies').select('id', { count: 'exact', head: true }).in('lead_email', emails);
          const { count: pc } = await supabase.from('replies').select('id', { count: 'exact', head: true }).in('lead_email', emails).eq('category', 'interested');
          replies = rc || 0;
          positive = pc || 0;
        }
        variantStats.push({ sent: emails.length, replies, positive });
      }

      return {
        ...exp,
        variant_a_label: 'Control',
        variant_b_label: allCampaigns.length > 1 ? 'Variant' : 'N/A',
        variant_a_sent: variantStats[0]?.sent || 0,
        variant_a_replies: variantStats[0]?.replies || 0,
        variant_a_positive: variantStats[0]?.positive || 0,
        variant_b_sent: variantStats[1]?.sent || 0,
        variant_b_replies: variantStats[1]?.replies || 0,
        variant_b_positive: variantStats[1]?.positive || 0,
      };
    })
  );

  // 5. Campaign metrics from pipeline_leads
  const { data: campaignLeads } = await supabase
    .from('pipeline_leads')
    .select('instantly_campaign_id, status')
    .gte('created_at', since);

  const campaignMetrics: Record<string, { pushed: number; total: number }> = {};
  for (const pl of campaignLeads || []) {
    const cid = pl.instantly_campaign_id || 'none';
    if (!campaignMetrics[cid]) campaignMetrics[cid] = { pushed: 0, total: 0 };
    campaignMetrics[cid].total++;
    if (pl.status === 'pushed') campaignMetrics[cid].pushed++;
  }

  // 6. Summary stats
  const totalRevenue = (attribution || []).filter((a) => a.outcome === 'won').reduce((s, a) => s + (a.deal_value || 0), 0);
  const wonCount = (attribution || []).filter((a) => a.outcome === 'won').length;
  const totalDeals = (attribution || []).length;
  const winRate = totalDeals > 0 ? Math.round((wonCount / totalDeals) * 100) : 0;
  const avgDays = totalDeals > 0
    ? Math.round((attribution || []).reduce((s, a) => s + (a.days_to_close || 0), 0) / totalDeals)
    : 0;
  const flaggedAccounts = (healthData || []).filter((h) => h.flagged).length;

  return NextResponse.json({
    summary: {
      total_revenue: totalRevenue,
      win_rate: winRate,
      avg_days_to_close: avgDays,
      active_experiments: (experiments || []).length,
      flagged_accounts: flaggedAccounts,
    },
    funnel,
    signal_roi: signalROI,
    account_health: healthData || [],
    experiments: experiments || [],
    campaign_metrics: campaignMetrics,
    recent_wins: (attribution || []).filter((a) => a.outcome === 'won').slice(0, 10),
    period_days: days,
  });
}
