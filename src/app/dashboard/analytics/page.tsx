'use client';

import { useState, useEffect, useCallback } from 'react';

interface Summary {
  total_revenue: number;
  win_rate: number;
  avg_days_to_close: number;
  active_experiments: number;
  flagged_accounts: number;
}

interface SignalROI {
  leads: number;
  won: number;
  lost: number;
  revenue: number;
}

interface AccountHealth {
  id: string;
  account_name: string;
  health_score: number;
  flagged: boolean;
  snapshot_date: string;
  risk_factors?: string[];
}

interface Experiment {
  id: string;
  name: string;
  status: string;
  variant_a_label: string;
  variant_b_label: string;
  variant_a_sent: number;
  variant_b_sent: number;
  variant_a_replies: number;
  variant_b_replies: number;
  variant_a_positive: number;
  variant_b_positive: number;
  created_at: string;
}

interface RecentWin {
  id: string;
  signal_type: string;
  account_name: string;
  deal_value: number;
  days_to_close: number;
  created_at: string;
}

interface AnalyticsData {
  summary: Summary;
  funnel: Record<string, number>;
  signal_roi: Record<string, SignalROI>;
  account_health: AccountHealth[];
  experiments: Experiment[];
  campaign_metrics: Record<string, { pushed: number; total: number }>;
  recent_wins: RecentWin[];
  period_days: number;
}

const PERIODS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function healthColor(score: number): { text: string; bg: string; border: string } {
  if (score > 70) return { text: 'text-accent-success', bg: 'bg-green-400/10', border: 'border-green-400/20' };
  if (score >= 40) return { text: 'text-accent-warning', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' };
  return { text: 'text-accent-danger', bg: 'bg-red-400/10', border: 'border-red-400/20' };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/analytics?days=${period}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to load');
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 w-32 bg-bg-surface-hover rounded animate-pulse" />
            <div className="h-4 w-64 bg-bg-surface-hover rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-bg-surface border border-border-subtle rounded-lg p-4 animate-pulse">
              <div className="h-7 w-20 bg-bg-surface-hover rounded mb-2" />
              <div className="h-3 w-24 bg-bg-surface-hover rounded" />
            </div>
          ))}
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-bg-surface border border-border-subtle rounded-lg p-6 animate-pulse">
            <div className="h-5 w-40 bg-bg-surface-hover rounded mb-4" />
            <div className="h-32 bg-bg-surface-hover rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-xl text-text-primary">Analytics</h1>
        </div>
        <div className="bg-bg-surface border border-red-400/20 rounded-lg p-6 text-center">
          <p className="text-sm text-red-400 mb-1">Failed to load analytics</p>
          <p className="text-xs text-text-tertiary font-mono">{error}</p>
          <button onClick={load} className="mt-3 text-xs text-accent-primary hover:underline">Try again</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const funnelEntries = Object.entries(data.funnel).sort((a, b) => b[1] - a[1]);
  const maxFunnel = Math.max(...funnelEntries.map(([, v]) => v), 1);
  const signalEntries = Object.entries(data.signal_roi).sort((a, b) => b[1].revenue - a[1].revenue);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-text-primary">Analytics</h1>
          <p className="text-sm text-text-tertiary mt-0.5">
            Unified view of pipeline, revenue, and experiments
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={`px-3 py-1.5 text-sm font-mono transition-colors ${
                  period === p.days
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface border border-border-subtle text-text-secondary text-sm rounded-lg hover:text-text-primary hover:border-border-hover disabled:opacity-50 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Revenue', value: formatCurrency(data.summary.total_revenue), color: 'text-accent-success' },
          { label: 'Win Rate', value: `${data.summary.win_rate}%`, color: 'text-accent-primary' },
          { label: 'Avg Days to Close', value: `${data.summary.avg_days_to_close}`, color: 'text-text-primary' },
          { label: 'Active Experiments', value: `${data.summary.active_experiments}`, color: 'text-blue-400' },
          { label: 'Flagged Accounts', value: `${data.summary.flagged_accounts}`, color: data.summary.flagged_accounts > 0 ? 'text-accent-danger' : 'text-accent-success' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-bg-surface border border-border-subtle rounded-lg p-4"
          >
            <div className={`text-2xl font-mono font-semibold ${color}`}>{value}</div>
            <div className="text-xs text-text-tertiary mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Funnel */}
      {funnelEntries.length > 0 && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <h2 className="font-display text-sm text-text-primary mb-4">Pipeline Funnel</h2>
          <div className="space-y-2.5">
            {funnelEntries.map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <span className="text-xs text-text-secondary w-32 shrink-0 truncate">{status}</span>
                <div className="flex-1 h-6 bg-bg-primary rounded overflow-hidden">
                  <div
                    className="h-full bg-accent-primary/30 rounded flex items-center px-2 transition-all duration-500"
                    style={{ width: `${Math.max((count / maxFunnel) * 100, 8)}%` }}
                  >
                    <span className="text-[11px] font-mono text-accent-primary">{count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signal ROI table */}
      {signalEntries.length > 0 && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <h2 className="font-display text-sm text-text-primary mb-4">Signal ROI</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-xs text-text-tertiary font-normal pb-2 pr-4">Signal Type</th>
                  <th className="text-right text-xs text-text-tertiary font-normal pb-2 px-4">Deals</th>
                  <th className="text-right text-xs text-text-tertiary font-normal pb-2 px-4">Won</th>
                  <th className="text-right text-xs text-text-tertiary font-normal pb-2 px-4">Lost</th>
                  <th className="text-right text-xs text-text-tertiary font-normal pb-2 px-4">Revenue</th>
                  <th className="text-right text-xs text-text-tertiary font-normal pb-2 pl-4">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {signalEntries.map(([signal, roi]) => {
                  const wr = roi.leads > 0 ? Math.round((roi.won / roi.leads) * 100) : 0;
                  return (
                    <tr key={signal} className="border-b border-border-subtle/50 last:border-0">
                      <td className="py-2.5 pr-4 text-text-primary font-mono text-xs">{signal}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-text-secondary">{roi.leads}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-accent-success">{roi.won}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-accent-danger">{roi.lost}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-text-primary">{formatCurrency(roi.revenue)}</td>
                      <td className="py-2.5 pl-4 text-right font-mono">
                        <span className={wr >= 50 ? 'text-accent-success' : wr >= 25 ? 'text-accent-warning' : 'text-accent-danger'}>
                          {wr}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Account Health Grid */}
      {data.account_health.length > 0 && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <h2 className="font-display text-sm text-text-primary mb-4">Account Health</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.account_health.map((account) => {
              const colors = healthColor(account.health_score);
              return (
                <div
                  key={account.id}
                  className={`border rounded-lg p-3 ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-lg font-mono font-semibold ${colors.text}`}>
                      {account.health_score}
                    </span>
                    {account.flagged && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-400/10 border border-red-400/20 text-accent-danger">
                        FLAGGED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-primary truncate">{account.account_name}</div>
                  {account.risk_factors && account.risk_factors.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {account.risk_factors.slice(0, 2).map((factor) => (
                        <span key={factor} className="text-[10px] font-mono text-text-tertiary bg-bg-primary px-1.5 py-0.5 rounded">
                          {factor}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* A/B Experiments */}
      {data.experiments.length > 0 && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <h2 className="font-display text-sm text-text-primary mb-4">Active Experiments</h2>
          <div className="space-y-4">
            {data.experiments.map((exp) => {
              const aRate = exp.variant_a_sent > 0 ? ((exp.variant_a_replies / exp.variant_a_sent) * 100).toFixed(1) : '0.0';
              const bRate = exp.variant_b_sent > 0 ? ((exp.variant_b_replies / exp.variant_b_sent) * 100).toFixed(1) : '0.0';
              const aPosRate = exp.variant_a_replies > 0 ? ((exp.variant_a_positive / exp.variant_a_replies) * 100).toFixed(1) : '0.0';
              const bPosRate = exp.variant_b_replies > 0 ? ((exp.variant_b_positive / exp.variant_b_replies) * 100).toFixed(1) : '0.0';

              return (
                <div key={exp.id} className="border border-border-subtle/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-text-primary font-medium">{exp.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-400/10 border border-blue-400/20 text-blue-400">
                      {exp.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Variant A */}
                    <div className="bg-bg-primary rounded-lg p-3">
                      <div className="text-xs text-text-tertiary mb-2 font-mono">A: {exp.variant_a_label}</div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-sm font-mono text-text-primary">{exp.variant_a_sent}</div>
                          <div className="text-[10px] text-text-tertiary">Sent</div>
                        </div>
                        <div>
                          <div className="text-sm font-mono text-accent-primary">{aRate}%</div>
                          <div className="text-[10px] text-text-tertiary">Reply</div>
                        </div>
                        <div>
                          <div className="text-sm font-mono text-accent-success">{aPosRate}%</div>
                          <div className="text-[10px] text-text-tertiary">Positive</div>
                        </div>
                      </div>
                    </div>
                    {/* Variant B */}
                    <div className="bg-bg-primary rounded-lg p-3">
                      <div className="text-xs text-text-tertiary mb-2 font-mono">B: {exp.variant_b_label}</div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-sm font-mono text-text-primary">{exp.variant_b_sent}</div>
                          <div className="text-[10px] text-text-tertiary">Sent</div>
                        </div>
                        <div>
                          <div className="text-sm font-mono text-accent-primary">{bRate}%</div>
                          <div className="text-[10px] text-text-tertiary">Reply</div>
                        </div>
                        <div>
                          <div className="text-sm font-mono text-accent-success">{bPosRate}%</div>
                          <div className="text-[10px] text-text-tertiary">Positive</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Wins */}
      {data.recent_wins.length > 0 && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <h2 className="font-display text-sm text-text-primary mb-4">Recent Wins</h2>
          <div className="space-y-2">
            {data.recent_wins.map((win) => (
              <div
                key={win.id}
                className="flex items-center justify-between border border-border-subtle/50 rounded-lg p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-400/10 border border-green-400/20 text-accent-success shrink-0">
                    WON
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary truncate">{win.account_name}</div>
                    <div className="text-[10px] text-text-tertiary font-mono">
                      {win.signal_type} &middot; {win.days_to_close}d to close
                    </div>
                  </div>
                </div>
                <div className="text-sm font-mono text-accent-success shrink-0 ml-3">
                  {formatCurrency(win.deal_value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no data at all */}
      {funnelEntries.length === 0 && signalEntries.length === 0 && data.account_health.length === 0 && data.experiments.length === 0 && data.recent_wins.length === 0 && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-10 text-center">
          <p className="text-sm text-text-secondary">
            No analytics data for the last {data.period_days} days. Data will appear as the pipeline processes leads and tracks outcomes.
          </p>
        </div>
      )}
    </div>
  );
}
