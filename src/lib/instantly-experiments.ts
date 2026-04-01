// src/lib/instantly-experiments.ts
// ============================================
// A/B testing for Instantly campaigns.
// Creates variants, splits leads, tracks results.
// ============================================

import { supabase } from '@/lib/supabase/client';

const DEFAULT_CLIENT_ID = '00000000-0000-0000-0000-000000000001';

export async function createExperiment(params: {
  name: string;
  baseCampaignId: string;
  signalType?: string;
  variantCampaignIds: string[];
  clientId?: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from('ab_experiments')
    .insert({
      name: params.name,
      base_campaign_id: params.baseCampaignId,
      signal_type: params.signalType || null,
      variant_campaign_ids: params.variantCampaignIds,
      status: 'active',
      client_id: params.clientId || DEFAULT_CLIENT_ID,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create experiment: ${error.message}`);
  return data.id;
}

export async function getExperimentResults(experimentId: string) {
  const { data: exp } = await supabase
    .from('ab_experiments')
    .select('*')
    .eq('id', experimentId)
    .single();

  if (!exp) return null;

  const allCampaigns = [exp.base_campaign_id, ...(exp.variant_campaign_ids || [])];
  const variants = [];

  for (let i = 0; i < allCampaigns.length; i++) {
    const { count: leadCount } = await supabase
      .from('ab_experiment_leads')
      .select('id', { count: 'exact', head: true })
      .eq('experiment_id', experimentId)
      .eq('variant_index', i);

    const { data: variantLeads } = await supabase
      .from('ab_experiment_leads')
      .select('lead_email')
      .eq('experiment_id', experimentId)
      .eq('variant_index', i);

    const emails = (variantLeads || []).map((l) => l.lead_email);

    // Count only interested replies (consistent with evaluator)
    const { count: positiveCount } = emails.length > 0
      ? await supabase.from('replies').select('id', { count: 'exact', head: true }).in('lead_email', emails).eq('category', 'interested')
      : { count: 0 };

    const { count: totalReplyCount } = emails.length > 0
      ? await supabase.from('replies').select('id', { count: 'exact', head: true }).in('lead_email', emails)
      : { count: 0 };

    const { data: revenue } = emails.length > 0
      ? await supabase.from('revenue_attribution').select('deal_value, outcome').in('campaign_id', [allCampaigns[i]])
      : { data: [] };

    const wonRevenue = (revenue || [])
      .filter((r) => r.outcome === 'won')
      .reduce((sum, r) => sum + (r.deal_value || 0), 0);

    const leads = leadCount || 0;
    variants.push({
      index: i,
      campaign_id: allCampaigns[i],
      label: i === 0 ? 'control' : `variant_${i}`,
      leads,
      replies: totalReplyCount || 0,
      positive_replies: positiveCount || 0,
      reply_rate: leads > 0 ? ((totalReplyCount || 0) / leads) : 0,
      positive_rate: leads > 0 ? ((positiveCount || 0) / leads) : 0,
      revenue: wonRevenue,
    });
  }

  return { ...exp, variants };
}
