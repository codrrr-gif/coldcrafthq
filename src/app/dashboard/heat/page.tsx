'use client';

import { useState, useEffect, useCallback } from 'react';

interface HeatEntry {
  id: string;
  company_id: string;
  score: number;
  tier: 1 | 2 | 3;
  signals_7d: number;
  signals_30d: number;
  last_signal_type: string | null;
  last_signal_at: string | null;
  last_calculated_at: string;
  companies: {
    name: string | null;
    domain: string;
    industry: string | null;
    status: string;
  } | null;
}

const SIGNAL_LABELS: Record<string, string> = {
  funding: 'Funding',
  job_posting: 'Hiring',
  leadership_change: 'New Leader',
  news: 'News',
  intent: 'Intent',
  tech_stack: 'Tech Stack',
  competitor_review: 'Competitor Rev.',
  job_change: 'Job Change',
};

function HeatBar({ score }: { score: number }) {
  const pct = Math.min((score / 300) * 100, 100);
  const color =
    score >= 150 ? 'bg-amber-400' :
    score >= 80  ? 'bg-cyan-400' :
                   'bg-text-tertiary';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-border-subtle rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono font-semibold ${score >= 150 ? 'text-amber-400' : score >= 80 ? 'text-cyan-400' : 'text-text-tertiary'}`}>
        {score}
      </span>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function HeatPage() {
  const [entries, setEntries] = useState<HeatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [filterTier, setFilterTier] = useState<1 | 2 | 3 | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch('/api/heat/score');
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const triggerRecalc = async () => {
    setRecalculating(true);
    await fetch('/api/heat/score', { method: 'POST' });
    setRecalculating(false);
    await loadData();
  };

  const filtered = filterTier ? entries.filter((e) => e.tier === filterTier) : entries;

  const tier1Count = entries.filter((e) => e.tier === 1).length;
  const tier2Count = entries.filter((e) => e.tier === 2).length;
  const hotSignals = entries.filter((e) => e.signals_7d > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-text-primary">Account Heat</h1>
          <p className="text-sm text-text-tertiary mt-0.5">Signal-weighted buying intent scores</p>
        </div>
        <button
          onClick={triggerRecalc}
          disabled={recalculating}
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white text-sm rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 transition-colors"
        >
          {recalculating ? (
            <>
              <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
              Recalculating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Recalculate
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Accounts', value: entries.length, color: 'text-text-primary' },
          { label: 'Tier 1 (Hot)', value: tier1Count, color: 'text-amber-400' },
          { label: 'Tier 2 (Warm)', value: tier2Count, color: 'text-cyan-400' },
          { label: 'Active 7d', value: hotSignals, color: 'text-green-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-bg-surface border border-border-subtle rounded-lg p-4">
            <div className={`text-2xl font-mono font-semibold ${color}`}>{value}</div>
            <div className="text-xs text-text-tertiary mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Tier filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-tertiary">Filter:</span>
        {([null, 1, 2, 3] as const).map((tier) => (
          <button
            key={String(tier)}
            onClick={() => setFilterTier(tier)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filterTier === tier
                ? 'border-accent-primary text-accent-primary'
                : 'border-border-subtle text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {tier === null ? 'All' : tier === 1 ? 'Hot' : tier === 2 ? 'Warm' : 'Cold'}
          </button>
        ))}
      </div>

      {/* Heat table */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-tertiary text-sm">Loading heat scores...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-text-tertiary text-sm">No heat scores yet</div>
            <div className="text-text-tertiary/60 text-xs mt-1">Scores are calculated daily or on-demand</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-4 py-3 text-left text-xs text-text-tertiary font-medium">Account</th>
                <th className="px-4 py-3 text-left text-xs text-text-tertiary font-medium">Heat Score</th>
                <th className="px-4 py-3 text-left text-xs text-text-tertiary font-medium">7d</th>
                <th className="px-4 py-3 text-left text-xs text-text-tertiary font-medium">30d</th>
                <th className="px-4 py-3 text-left text-xs text-text-tertiary font-medium">Last Signal</th>
                <th className="px-4 py-3 text-left text-xs text-text-tertiary font-medium">Status</th>
                <th className="px-4 py-3 text-left text-xs text-text-tertiary font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-bg-surface-hover transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary">
                      {entry.companies?.name || entry.companies?.domain || entry.company_id.slice(0, 8)}
                    </div>
                    {entry.companies?.name && (
                      <div className="text-xs text-text-tertiary font-mono">{entry.companies.domain}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <HeatBar score={entry.score} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono font-medium ${entry.signals_7d > 0 ? 'text-green-400' : 'text-text-tertiary'}`}>
                      {entry.signals_7d}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-text-secondary">{entry.signals_30d}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-text-secondary">
                      {entry.last_signal_type ? SIGNAL_LABELS[entry.last_signal_type] || entry.last_signal_type : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs capitalize ${
                      entry.companies?.status === 'meeting' ? 'text-amber-400' :
                      entry.companies?.status === 'replied' ? 'text-cyan-400' :
                      entry.companies?.status === 'contacted' ? 'text-blue-400' :
                      'text-text-tertiary'
                    }`}>
                      {entry.companies?.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-text-tertiary">
                      {timeAgo(entry.last_calculated_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
