'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FunnelMetrics } from '@/lib/gtm/types';

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }
function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function InsightsPage() {
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  const loadMetrics = useCallback(async () => {
    const res = await fetch('/api/learning/insights');
    if (res.ok) setMetrics(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const triggerOptimize = async () => {
    setOptimizing(true);
    await fetch('/api/learning/optimize', { method: 'POST' });
    setOptimizing(false);
    await loadMetrics();
  };

  if (loading) {
    return <div className="p-12 text-center text-text-tertiary text-sm">Loading insights...</div>;
  }

  if (!metrics) {
    return <div className="p-12 text-center text-text-tertiary text-sm">Failed to load insights.</div>;
  }

  const { overall } = metrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-text-primary">Insights</h1>
          <p className="text-sm text-text-tertiary mt-0.5">
            Self-learning performance analytics
            {metrics.last_optimized_at && (
              <span className="ml-2 text-text-tertiary/60">· last optimized {timeAgo(metrics.last_optimized_at)}</span>
            )}
          </p>
        </div>
        <button
          onClick={triggerOptimize}
          disabled={optimizing}
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white text-sm rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 transition-colors"
        >
          {optimizing ? (
            <><span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />Optimizing...</>
          ) : (
            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>Run Optimization</>
          )}
        </button>
      </div>

      {/* Overall funnel */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Signals', value: overall.signals_total, color: 'text-text-primary' },
          { label: 'Pushed', value: overall.pushed, color: 'text-blue-400' },
          { label: 'Replied', value: overall.replied, color: 'text-cyan-400' },
          { label: 'Interested', value: overall.interested, color: 'text-purple-400', sub: pct(overall.interest_rate) },
          { label: 'Meeting', value: overall.meeting, color: 'text-amber-400', sub: pct(overall.meeting_rate) },
          { label: 'Won', value: overall.won, color: 'text-green-400' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-bg-surface border border-border-subtle rounded-lg p-4">
            <div className={`text-2xl font-mono font-semibold ${color}`}>{value}</div>
            <div className="text-xs text-text-tertiary mt-1">{label}</div>
            {sub && <div className={`text-xs font-mono ${color} mt-0.5`}>{sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signal conversion table */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h2 className="text-sm font-medium text-text-primary">Signal Conversion Rates</h2>
            <p className="text-xs text-text-tertiary mt-0.5">Learned scores vs defaults</p>
          </div>
          {metrics.by_signal_type.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-tertiary">No data yet — needs 10+ pushed leads per signal type</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="px-4 py-2 text-left text-xs text-text-tertiary font-medium">Signal</th>
                  <th className="px-4 py-2 text-right text-xs text-text-tertiary font-medium">Pushed</th>
                  <th className="px-4 py-2 text-right text-xs text-text-tertiary font-medium">Conv.</th>
                  <th className="px-4 py-2 text-right text-xs text-text-tertiary font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {metrics.by_signal_type.map((row) => (
                  <tr key={row.signal_type} className="hover:bg-bg-surface-hover transition-colors">
                    <td className="px-4 py-2">
                      <span className="text-xs text-text-secondary capitalize">{row.signal_type.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className="text-xs font-mono text-text-secondary">{row.pushed}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={`text-xs font-mono ${row.conversion_rate > 0.05 ? 'text-green-400' : row.conversion_rate > 0 ? 'text-amber-400' : 'text-text-tertiary'}`}>
                        {pct(row.conversion_rate)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {row.learned_score !== null ? (
                          <>
                            <span className="text-xs font-mono text-accent-primary font-medium">{row.learned_score}</span>
                            <span className="text-xs text-text-tertiary">/{row.default_score}</span>
                          </>
                        ) : (
                          <span className="text-xs font-mono text-text-tertiary">{row.default_score}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Winning ICP patterns */}
        <div className="space-y-4">
          {[
            { title: 'Top Industries', data: metrics.top_industries, key: 'industry' },
            { title: 'Top Company Sizes', data: metrics.top_headcount, key: 'range' },
            { title: 'Top Funding Stages', data: metrics.top_funding, key: 'stage' },
          ].map(({ title, data, key }) => (
            <div key={title} className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border-subtle">
                <h2 className="text-sm font-medium text-text-primary">{title}</h2>
              </div>
              {data.length === 0 ? (
                <div className="px-4 py-4 text-xs text-text-tertiary">No meetings yet</div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {data.slice(0, 3).map((row) => {
                    const label = (row as Record<string, string | number>)[key] as string;
                    const count = row.meeting_count;
                    const max = data[0].meeting_count;
                    return (
                      <div key={label} className="px-4 py-2.5 flex items-center gap-3">
                        <span className="text-xs text-text-secondary capitalize flex-1">{label}</span>
                        <div className="w-20 h-1.5 bg-border-subtle rounded-full overflow-hidden">
                          <div className="h-full bg-accent-primary rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-text-tertiary w-4 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Winning openers */}
      {metrics.sample_openers.length > 0 && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h2 className="text-sm font-medium text-text-primary">Winning Opener Patterns</h2>
            <p className="text-xs text-text-tertiary mt-0.5">Extracted from replies classified as &ldquo;interested&rdquo;</p>
          </div>
          <div className="divide-y divide-border-subtle">
            {metrics.sample_openers.map((opener) => (
              <div key={opener.id} className="px-4 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono bg-accent-glow text-accent-primary px-2 py-0.5 rounded">
                    {opener.signal_type}
                  </span>
                  {opener.industry && (
                    <span className="text-xs text-text-tertiary">{opener.industry}</span>
                  )}
                </div>
                <p className="text-sm text-text-primary italic">&ldquo;{opener.example_opener}&rdquo;</p>
                <p className="text-xs text-text-tertiary mt-1.5">{opener.pattern_summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
