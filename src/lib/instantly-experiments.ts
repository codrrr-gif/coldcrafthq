// src/lib/instantly-experiments.ts
// ============================================
// A/B testing for Instantly campaigns.
// Creates variants, splits leads, tracks results.
// ============================================

import { supabase } from '@/lib/supabase/client';
import { addLeadsToCampaign } from './instantly';

export async function createExperiment(params: {
  name: string;
  baseCampaignId: string;
  signalType?: string;
  variantCampaignIds: string[];
}): Promise<string> {
  const { data, error } = await supabase
    .from('ab_experiments')
    .insert({
      name: params.name,
      base_campaign_id: params.baseCampaignId,
      signal_type: params.signalType || null,
      variant_campaign_ids: params.variantCampaignIds,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create experiment: ${error.message}`);
  return data.id;
}

export async function assignLeadToExperiment(
  experimentId: string,
  leadEmail: string
): Promise<{ campaignId: string; variantIndex: number }> {
  const { data: exp } = await supabase
    .from('ab_experiments')
    .select('*')
    .eq('id', experimentId)
    .single();

  if (!exp || exp.status !== 'active') throw new Error('Experiment not active');

  const allCampaigns = [exp.base_campaign_id, ...exp.variant_campaign_ids];

  // Round-robin: count existing assignments per variant, assign to least-used
  const { data: counts } = await supabase
    .from('ab_experiment_leads')
    .select('variant_index')
    .eq('experiment_id', experimentId);

  const countPerVariant = new Map<number, number>();
  for (let i = 0; i < allCampaigns.length; i++) countPerVariant.set(i, 0);
  for (const c of counts || []) {
    countPerVariant.set(c.variant_index, (countPerVariant.get(c.variant_index) || 0) + 1);
  }

  let minIndex = 0;
  let minCount = Infinity;
  for (const [idx, count] of countPerVariant) {
    if (count < minCount) { minCount = count; minIndex = idx; }
  }

  const campaignId = allCampaigns[minIndex];

  await addLeadsToCampaign(campaignId, [{ email: leadEmail }]);

  await supabase.from('ab_experiment_leads').upsert(
    {
      experiment_id: experimentId,
      lead_email: leadEmail,
      variant_index: minIndex,
      campaign_id: campaignId,
    },
    { onConflict: 'experiment_id,lead_email' }
  );

  await supabase
    .from('ab_experiments')
    .update({ total_leads: (exp.total_leads || 0) + 1 })
    .eq('id', experimentId);

  return { campaignId, variantIndex: minIndex };
}

export async function getExperimentResults(experimentId: string) {
  const { data: exp } = await supabase
    .from('ab_experiments')
    .select('*')
    .eq('id', experimentId)
    .single();

  if (!exp) return null;

  const allCampaigns = [exp.base_campaign_id, ...exp.variant_campaign_ids];
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
    const { count: replyCount } = emails.length > 0
      ? await supabase.from('replies').select('id', { count: 'exact', head: true }).in('lead_email', emails)
      : { count: 0 };

    const { data: revenue } = emails.length > 0
      ? await supabase.from('revenue_attribution').select('deal_value, outcome').in('campaign_id', [allCampaigns[i]])
      : { data: [] };

    const wonRevenue = (revenue || [])
      .filter((r) => r.outcome === 'won')
      .reduce((sum, r) => sum + (r.deal_value || 0), 0);

    variants.push({
      index: i,
      campaign_id: allCampaigns[i],
      label: i === 0 ? 'control' : `variant_${i}`,
      leads: leadCount || 0,
      replies: replyCount || 0,
      reply_rate: (leadCount || 0) > 0 ? ((replyCount || 0) / (leadCount || 1)) : 0,
      revenue: wonRevenue,
    });
  }

  return { ...exp, variants };
}
