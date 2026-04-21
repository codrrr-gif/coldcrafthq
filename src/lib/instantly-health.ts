// src/lib/instantly-health.ts
// ============================================
// Monitors sending account health across all Instantly accounts.
// Checks bounce rates, reply rates, flags degraded accounts.
// Also checks reply webhook status and auto-re-enables if disabled.
// ============================================

import { supabase } from '@/lib/supabase/client';
import { listSendingAccounts, getCampaigns, pauseCampaign } from './instantly';
import { notifySlack } from './slack';

const BOUNCE_PAUSE_THRESHOLD = 0.02; // 2% — Google/Microsoft enforcement threshold

interface AccountHealth {
  email: string;
  sends: number;
  bounces: number;
  replies: number;
  bounce_rate: number;
  reply_rate: number;
  health_score: number;
  flagged: boolean;
}

export async function checkAccountHealth(): Promise<{
  accounts: number;
  flagged: number;
  paused: number;
  results: AccountHealth[];
}> {
  const accounts = await listSendingAccounts();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const results: AccountHealth[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Pre-compute workspace-level metrics once (email_outcomes lacks from_email
  // so we can't do per-account filtering — these are workspace-wide aggregates).
  // Each account's share is estimated by its daily_limit proportion.
  const { count: totalBounces } = await supabase
    .from('email_outcomes')
    .select('id', { count: 'exact', head: true })
    .eq('outcome', 'hard_bounce')
    .gte('recorded_at', sevenDaysAgo);

  const { count: totalReplies } = await supabase
    .from('replies')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo);

  const { count: totalSends } = await supabase
    .from('pipeline_leads')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pushed')
    .gte('updated_at', sevenDaysAgo);

  const workspaceSends = totalSends || 1;
  const workspaceBounces = totalBounces || 0;
  const workspaceReplies = totalReplies || 0;
  const totalDailyLimit = accounts.reduce((sum, a) => sum + (a.daily_limit || 50), 0) || 1;

  for (const account of accounts) {
    const accountShare = (account.daily_limit || 50) / totalDailyLimit;
    const sends = Math.max(1, Math.round(workspaceSends * accountShare));
    const bounces = Math.round(workspaceBounces * accountShare);
    const replies = Math.round(workspaceReplies * accountShare);
    const bounceRate = bounces / sends;
    const replyRate = replies / sends;
    const healthScore = Math.max(0, Math.min(100, Math.round(100 - bounceRate * 200 + replyRate * 50)));
    const flagged = bounceRate > 0.02 || healthScore < 50;

    const health: AccountHealth = {
      email: account.email,
      sends,
      bounces,
      replies,
      bounce_rate: parseFloat(bounceRate.toFixed(6)),
      reply_rate: parseFloat(replyRate.toFixed(6)),
      health_score: healthScore,
      flagged,
    };

    results.push(health);

    await supabase.from('account_health_snapshots').upsert(
      {
        account_email: account.email,
        snapshot_date: today,
        sends: health.sends,
        bounces: health.bounces,
        replies: health.replies,
        bounce_rate: health.bounce_rate,
        reply_rate: health.reply_rate,
        health_score: health.health_score,
        flagged: health.flagged,
      },
      { onConflict: 'account_email,snapshot_date' }
    );
  }

  // Slack alert if any flagged
  const flaggedAccounts = results.filter((r) => r.flagged);
  if (flaggedAccounts.length > 0) {
    try {
      const { notifySlack } = await import('./slack');
      const lines = flaggedAccounts.map(
        (a) => `• ${a.email}: ${(a.bounce_rate * 100).toFixed(1)}% bounce, score ${a.health_score}`
      );
      await notifySlack(
        `⚠️ ${flaggedAccounts.length} sending account(s) flagged:\n${lines.join('\n')}`,
        'warning'
      );
    } catch {}
  }

  // Auto-pause campaigns if workspace bounce rate exceeds threshold
  const workspaceBounceRate = workspaceBounces / workspaceSends;
  let paused = 0;
  if (workspaceBounceRate > BOUNCE_PAUSE_THRESHOLD) {
    try {
      const campaigns = await getCampaigns();
      const active = campaigns.filter((c) => c.status === 'active' || c.status === 'sending');
      for (const campaign of active) {
        const ok = await pauseCampaign(campaign.id);
        if (ok) paused++;
      }
      if (paused > 0) {
        const { notifySlack } = await import('./slack');
        const thresholdPct = (BOUNCE_PAUSE_THRESHOLD * 100).toFixed(0);
        await notifySlack(
          `🛑 Bounce rate ${(workspaceBounceRate * 100).toFixed(1)}% exceeds ${thresholdPct}% — auto-paused ${paused} campaign(s). Investigate before resuming.`,
          'error'
        );
      }
    } catch (err) {
      console.error('[health] Auto-pause failed:', err);
    }
  }

  return { accounts: accounts.length, flagged: flaggedAccounts.length, paused, results };
}

// ============================================
// Reply webhook status check
// ============================================
// Instantly auto-disables webhooks after repeated failed deliveries.
// This probes the reply webhook, attempts to re-enable if disabled,
// and alerts Slack so we know it happened.

interface InstantlyWebhook {
  id: string;
  event_type: string;
  target_hook_url: string;
  status: number; // 1 = active, -1 = disabled
  timestamp_error?: string;
}

async function instantlyApi<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://api.instantly.ai/api/v2${path}`, {
      ...init,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error(`[instantly-health] ${path} -> ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[instantly-health] ${path} failed:`, err);
    return null;
  }
}

export async function checkReplyWebhookStatus(): Promise<{
  found: boolean;
  status: number | null;
  reenabled: boolean;
}> {
  const list = await instantlyApi<{ items: InstantlyWebhook[] }>('/webhooks');
  if (!list?.items) return { found: false, status: null, reenabled: false };

  // The reply webhook is the one subscribed to all_events, not bounce-only
  const hook = list.items.find((h) => h.event_type === 'all_events');
  if (!hook) return { found: false, status: null, reenabled: false };

  if (hook.status === 1) {
    return { found: true, status: 1, reenabled: false };
  }

  // Disabled — try to re-enable
  const patched = await instantlyApi<InstantlyWebhook>(`/webhooks/${hook.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 1 }),
  });
  const reenabled = patched?.status === 1;

  notifySlack(
    reenabled
      ? `♻️ Instantly reply webhook was disabled (last error ${hook.timestamp_error || 'unknown'}) — auto re-enabled.`
      : `🚨 Instantly reply webhook is DISABLED (last error ${hook.timestamp_error || 'unknown'}) and auto re-enable failed. Check https://app.instantly.ai/app/settings/integrations`,
    reenabled ? 'warning' : 'error'
  ).catch(() => {});

  return { found: true, status: hook.status, reenabled };
}
