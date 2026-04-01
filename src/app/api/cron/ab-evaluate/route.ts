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

      // Compare each variant against the base using pairwise z-tests
      const base = stats[0];
      let bestVariant: VariantStats | null = null;
      let bestZ = 0;
      let anySignificant = false;
      const losers: VariantStats[] = [];

      for (let i = 1; i < stats.length; i++) {
        const variant = stats[i];
        const z = zTestProportions(base.leads, base.rate, variant.leads, variant.rate);

        if (Math.abs(z) >= Z_THRESHOLD) {
          anySignificant = true;
          if (variant.rate > base.rate && z < bestZ) {
            // Variant beats base — track it
          }
          if (z < -Z_THRESHOLD) {
            // Variant is significantly better than base
            if (!bestVariant || variant.rate > bestVariant.rate) {
              bestVariant = variant;
              bestZ = z;
            }
          } else if (z > Z_THRESHOLD) {
            // Base is significantly better — variant loses
            losers.push(variant);
          }
        }
      }

      // Also check if base beats all variants
      const baseWins = losers.length === stats.length - 1;
      const winner = baseWins ? base : (bestVariant || (anySignificant ? base : null));

      if (!winner) {
        const rateStr = stats.map((s) => `v${s.index}=${(s.rate * 100).toFixed(1)}%`).join(', ');
        results.push({
          signal_type: exp.signal_type || 'unknown',
          action: 'no_significance',
          details: `No significant difference yet. Rates: ${rateStr}`,
        });
        continue;
      }

      const winnerLabel = winner === base ? 'Base' : `Variant ${winner.index}`;

      // Update experiment
      await supabase
        .from('ab_experiments')
        .update({
          status: 'completed',
          winner_campaign_id: winner.campaignId,
          ended_at: new Date().toISOString(),
        })
        .eq('id', exp.id);

      // Pause all losing campaigns
      for (const s of stats) {
        if (s.campaignId !== winner.campaignId) {
          await pauseCampaign(s.campaignId);
        }
      }

      // Notify Slack
      const rateBreakdown = stats.map((s) =>
        `${s.index === 0 ? 'Base' : `V${s.index}`}: ${s.positiveReplies}/${s.leads} (${(s.rate * 100).toFixed(1)}%)`
      ).join(' | ');

      const message = [
        `*A/B Winner Declared: ${exp.signal_type}*`,
        `${winnerLabel} wins at 95% confidence`,
        rateBreakdown,
        `Losing campaign${stats.length > 2 ? 's' : ''} paused. All future ${exp.signal_type} leads route to winner.`,
      ].join('\n');

      await notifySlack(message, 'info');

      results.push({
        signal_type: exp.signal_type || 'unknown',
        action: 'declared_winner',
        details: `${winnerLabel} wins. ${rateBreakdown}`,
      });
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
