'use client';

import { useState, useEffect, useCallback } from 'react';

interface Company {
  id: string;
  domain: string;
  name: string | null;
  industry: string | null;
  headcount_range: string | null;
  funding_stage: string | null;
  location: string | null;
  tier: 1 | 2 | 3;
  tam_score: number;
  status: string;
  last_signal_at: string | null;
  source: string | null;
  created_at: string;
}

interface Coverage {
  total: number;
  tier1: number;
  tier2: number;
  tier3: number;
  contacted: number;
  replied: number;
  meeting: number;
}

const TIER_CONFIG = {
  1: { label: 'Tier 1', color: 'text-amber-400', dot: 'bg-amber-400', ring: 'ring-amber-400/30' },
  2: { label: 'Tier 2', color: 'text-cyan-400', dot: 'bg-cyan-400', ring: 'ring-cyan-400/30' },
  3: { label: 'Tier 3', color: 'text-text-tertiary', dot: 'bg-text-tertiary', ring: 'ring-border-subtle' },
} as const;

const STATUS_COLORS: Record<string, string> = {
  discovered:  'text-text-tertiary',
  contacted:   'text-blue-400',
  replied:     'text-cyan-400',
  meeting:     'text-amber-400',
  won:         'text-green-400',
  lost:        'text-red-400',
  paused:      'text-text-tertiary',
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TAMPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [filterTier, setFilterTier] = useState<1 | 2 | 3 | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [companiesRes, coverageRes] = await Promise.all([
      fetch('/api/tam/discover'),
      fetch('/api/tam/coverage'),
    ]);
    if (companiesRes.ok) setCompanies(await companiesRes.json());
    if (coverageRes.ok) setCoverage(await coverageRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const triggerDiscover = async () => {
    setDiscovering(true);
    await fetch('/api/tam/discover', { method: 'POST' });
    setDiscovering(false);
    await loadData();
  };

  const filtered = companies.filter((c) => {
    if (filterTier && c.tier !== filterTier) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-text-primary">TAM Map</h1>
          <p className="text-sm text-text-tertiary mt-0.5">Total addressable market coverage</p>
        </div>
        <button
          onClick={triggerDiscover}
          disabled={discovering}
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white text-sm rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 transition-colors"
        >
          {discovering ? (
            <>
              <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
              Discovering...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Discover Companies
            </>
          )}
        </button>
      </div>

      {/* Coverage stats */}
      {coverage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Companies', value: coverage.total, color: 'text-text-primary' },
            { label: 'Tier 1', value: coverage.tier1, color: 'text-amber-400' },
            { label: 'Tier 2', value: coverage.tier2, color: 'text-cyan-400' },
            { label: 'Meetings', value: coverage.meeting, color: 'text-green-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-bg-surface border border-border-subtle rounded-lg p-4">
              <div className={`text-2xl font-mono font-semibold ${color}`}>{value}</div>
              <div className="text-xs text-text-tertiary mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-tertiary">Tier:</span>
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
            {tier === null ? 'All' : `Tier ${tier}`}
          </button>
        ))}
        <div className="w-px h-4 bg-border-subtle mx-1" />
        <span className="text-xs text-text-tertiary">Status:</span>
        {[null, 'discovered', 'contacted', 'replied', 'meeting'].map((status) => (
          <button
            key={String(status)}
            onClick={() => setFilterStatus(status)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filterStatus === status
                ? 'border-accent-primary text-accent-primary'
                : 'border-border-subtle text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {status === null ? 'All' : status}
          </button>
        ))}
      </div>

      {/* Companies table */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-tertiary text-sm">Loading companies...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-text-tertiary text-sm">No companies yet</div>
            <div className="text-text-tertiary/60 text-xs mt-1">Click &ldquo;Discover Companies&rdquo; to start building your TAM</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-4 py-3 text-left text-xs text-text-tertiary font-medium">Company</th>
                <th className="px-4 py-3 text-left text-xs text-text-tertiary font-medium">Tier</th>
                <th className="px-4 py-3 text-left text-xs text-text-tertiary font-medium">Score</th>
                <th className="px-4 py-3 text-left text-xs text-text-tertiary font-medium">Industry</th>
                <th className="px-4 py-3 text-left text-xs text-text-tertiary font-medium">Stage</th>
                <th className="px-4 py-3 text-left text-xs text-text-tertiary font-medium">Status</th>
                <th className="px-4 py-3 text-left text-xs text-text-tertiary font-medium">Last Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((company) => {
                const tier = TIER_CONFIG[company.tier];
                return (
                  <tr key={company.id} className="hover:bg-bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{company.name || company.domain}</div>
                      {company.name && <div className="text-xs text-text-tertiary font-mono">{company.domain}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${tier.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
                        {tier.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-border-subtle rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-primary rounded-full"
                            style={{ width: `${company.tam_score}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-secondary font-mono">{company.tam_score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-secondary">{company.industry || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-secondary capitalize">{company.funding_stage || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs capitalize ${STATUS_COLORS[company.status] || 'text-text-tertiary'}`}>
                        {company.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-tertiary">
                        {company.last_signal_at ? timeAgo(company.last_signal_at) : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
