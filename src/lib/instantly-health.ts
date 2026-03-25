// src/lib/instantly-health.ts
// ============================================
// Monitors sending account health across all Instantly accounts.
// Checks bounce rates, reply rates, flags degraded accounts.
// ============================================

import { supabase } from '@/lib/supabase/client';
import { listSendingAccounts } from './instantly';

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
    const flagged = bounceRate > 0.05 || healthScore < 40;

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

  return { accounts: accounts.length, flagged: flaggedAccounts.length, results };
}
