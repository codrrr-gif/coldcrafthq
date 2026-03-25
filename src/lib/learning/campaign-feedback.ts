// src/lib/learning/campaign-feedback.ts
// Pulls Instantly campaign analytics and stores performance data
// in learning_weights (weight_type='campaign') so the signal optimizer
// can blend campaign performance into signal scores.

import { supabase } from '@/lib/supabase/client';
import { getCampaigns } from '@/lib/instantly';

const API_BASE = 'https://api.instantly.ai/api/v2';

interface CampaignAnalytics {
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
  open_rate: number;
  reply_rate: number;
}

async function fetchCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics | null> {
  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) throw new Error('INSTANTLY_API_KEY not set');

  const res = await fetch(`${API_BASE}/campaigns/${campaignId}/analytics`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    console.warn(`[campaign-feedback] Analytics fetch failed for ${campaignId}: ${res.status}`);
    return null;
  }

  const data = await res.json();
  const analytics = data.data || data;

  const emailsSent = analytics.emails_sent ?? analytics.total_sent ?? 0;
  const emailsOpened = analytics.emails_opened ?? analytics.total_opened ?? 0;
  const emailsReplied = analytics.emails_replied ?? analytics.total_replied ?? 0;

  return {
    emails_sent: emailsSent,
    emails_opened: emailsOpened,
    emails_replied: emailsReplied,
    open_rate: emailsSent > 0 ? emailsOpened / emailsSent : 0,
    reply_rate: emailsSent > 0 ? emailsReplied / emailsSent : 0,
  };
}

export async function pullCampaignMetrics(): Promise<number> {
  const campaigns = await getCampaigns();
  let updated = 0;

  for (const campaign of campaigns) {
    const analytics = await fetchCampaignAnalytics(campaign.id);
    if (!analytics || analytics.emails_sent === 0) continue;

    // Align with signal optimizer scale (SCALE_FACTOR = 1500)
    const learnedScore = Math.max(10, Math.min(200, Math.round(analytics.reply_rate * 1500)));

    const { error } = await supabase.from('learning_weights').upsert(
      {
        weight_type: 'campaign',
        dimension_value: campaign.id,
        learned_score: learnedScore,
        conversion_rate: parseFloat(analytics.reply_rate.toFixed(4)),
        sample_count: analytics.emails_sent,
        leads_pushed: analytics.emails_sent,
        leads_replied: analytics.emails_replied,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: 'weight_type,dimension_value' },
    );

    if (error) {
      console.error(`[campaign-feedback] Failed to upsert campaign ${campaign.id}:`, error);
    } else {
      console.log(
        `[campaign-feedback] ${campaign.name}: sent=${analytics.emails_sent} replied=${analytics.emails_replied} rate=${(analytics.reply_rate * 100).toFixed(1)}% score=${learnedScore}`,
      );
      updated++;
    }
  }

  return updated;
}
