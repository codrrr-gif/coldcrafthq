// src/app/api/cron/ab-evaluate/route.ts
// ============================================
// Cron: Evaluate A/B signal experiments weekly.
// For each active experiment with enough data,
// compares positive reply rates between base and
// variant campaigns. Declares a winner at 95%
// confidence, pauses the loser, notifies Slack.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { requireSecret } from '@/lib/auth/api-auth';
import { notifySlack } from '@/lib/slack';

export const dynamic = 'force-dynamic';

const MIN_LEADS_PER_VARIANT = 50;
const Z_THRESHOLD = 1.96; // 95% confidence

interface VariantStats {
  index: number;
  campaignId: string;
  leads: number;
  positiveReplies: number;
  rate: number;
}

async function pauseCampaign(campaignId: string): Promise<boolean> {
  const key = process.env.INSTANTLY_API_KEY;
  if (!key) return false;

  const res = await fetch(`https://api.instantly.ai/api/v2/campaigns/${campaignId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 0 }),
    signal: AbortSignal.timeout(10000),
  });

  return res.ok;
}

function zTestProportions(n1: number, p1: number, n2: number, p2: number): number {
  const pPool = (p1 * n1 + p2 * n2) / (n1 + n2);
  if (pPool === 0 || pPool === 1) return 0; // can't test if all same
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  if (se === 0) return 0;
  return (p1 - p2) / se;
}

async function getVariantStats(experimentId: string, campaignIds: string[]): Promise<VariantStats[]> {
  const stats: VariantStats[] = [];

  for (let i = 0; i < campaignIds.length; i++) {
    // Count leads assigned to this variant
    const { count: leadCount } = await supabase
      .from('ab_experiment_leads')
      .select('id', { count: 'exact', head: true })
      .eq('experiment_id', experimentId)
      .eq('variant_index', i);

    // Get lead emails for this variant
    const { data: variantLeads } = await supabase
      .from('ab_experiment_leads')
      .select('lead_email')
      .eq('experiment_id', experimentId)
      .eq('variant_index', i);

    const emails = (variantLeads || []).map((l) => l.lead_email);

    // Count positive replies (category = 'interested')
    let positiveCount = 0;
    if (emails.length > 0) {
      const { count } = await supabase
        .from('replies')
        .select('id', { count: 'exact', head: true })
        .in('lead_email', emails)
        .eq('category', 'interested');
      positiveCount = count || 0;
    }

    const leads = leadCount || 0;
    stats.push({
      index: i,
      campaignId: campaignIds[i],
      leads,
      positiveReplies: positiveCount,
      rate: leads > 0 ? positiveCount / leads : 0,
    });
  }

  return stats;
}

export async function GET(req: NextRequest) {
  const authErr = requireSecret(req);
  if (authErr) return authErr;

  const results: Array<{
    signal_type: string;
    action: 'declared_winner' | 'insufficient_data' | 'no_significance';
    details: string;
  }> = [];

  try {
    const { data: experiments } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('status', 'active');

    if (!experiments?.length) {
      return NextResponse.json({ message: 'No active experiments', results: [] });
    }

    for (const exp of experiments) {
      const allCampaigns = [exp.base_campaign_id, ...(exp.variant_campaign_ids || [])];
      const stats = await getVariantStats(exp.id, allCampaigns);

      // Check minimum sample size
      const allHaveMinimum = stats.every((s) => s.leads >= MIN_LEADS_PER_VARIANT);
      if (!allHaveMinimum) {
        const leadCounts = stats.map((s) => `v${s.index}=${s.leads}`).join(', ');
        results.push({
          signal_type: exp.signal_type || 'unknown',
          action: 'insufficient_data',
          details: `Need ${MIN_LEADS_PER_VARIANT}/variant. Current: ${leadCounts}`,
        });
        continue;
      }

      // For 2-variant experiments (base vs variant), run z-test
      if (stats.length === 2) {
        const [base, variant] = stats;
        const z = zTestProportions(base.leads, base.rate, variant.leads, variant.rate);

        if (Math.abs(z) < Z_THRESHOLD) {
          results.push({
            signal_type: exp.signal_type || 'unknown',
            action: 'no_significance',
            details: `z=${z.toFixed(2)} (need >${Z_THRESHOLD}). Base: ${(base.rate * 100).toFixed(1)}% (${base.positiveReplies}/${base.leads}), Variant: ${(variant.rate * 100).toFixed(1)}% (${variant.positiveReplies}/${variant.leads})`,
          });
          continue;
        }

        // We have a winner
        const winner = z > 0 ? base : variant;
        const loser = z > 0 ? variant : base;
        const winnerLabel = z > 0 ? 'Base' : 'Variant';

        // Update experiment
        await supabase
          .from('ab_experiments')
          .update({
            status: 'completed',
            winner_campaign_id: winner.campaignId,
            ended_at: new Date().toISOString(),
          })
          .eq('id', exp.id);

        // Pause the losing campaign
        await pauseCampaign(loser.campaignId);

        // Notify Slack
        const message = [
          `*A/B Winner Declared: ${exp.signal_type}*`,
          `${winnerLabel} wins with ${(winner.rate * 100).toFixed(1)}% positive reply rate vs ${(loser.rate * 100).toFixed(1)}%`,
          `Base: ${base.positiveReplies}/${base.leads} interested | Variant: ${variant.positiveReplies}/${variant.leads} interested`,
          `z-score: ${Math.abs(z).toFixed(2)} (95% confidence)`,
          `Losing campaign paused. All future ${exp.signal_type} leads route to winner.`,
        ].join('\n');

        await notifySlack(message, 'info');

        results.push({
          signal_type: exp.signal_type || 'unknown',
          action: 'declared_winner',
          details: `${winnerLabel} wins. ${(winner.rate * 100).toFixed(1)}% vs ${(loser.rate * 100).toFixed(1)}% (z=${Math.abs(z).toFixed(2)})`,
        });
      }
    }

    return NextResponse.json({ evaluated: experiments.length, results });
  } catch (err) {
    console.error('[ab-evaluate] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
