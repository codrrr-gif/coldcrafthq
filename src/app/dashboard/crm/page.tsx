'use client';

import { useState, useEffect, useCallback } from 'react';

interface CrmLead {
  id: string;
  name: string;
  close_url: string;
  contact_name: string | null;
  contact_email: string | null;
  status_label: string;
  opportunity_status: string | null;
  opportunity_type: 'active' | 'won' | 'lost' | null;
  opportunity_value: number | null;
  latest_note: string | null;
  date_created: string;
  date_updated: string;
}

interface CrmData {
  summary: { total: number; active: number; won: number; lost: number; no_opportunity: number };
  groups: { active: CrmLead[]; won: CrmLead[]; lost: CrmLead[]; none: CrmLead[] };
  all: CrmLead[];
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const STAGE_CONFIG = {
  active:  { label: 'Active',         color: 'text-blue-400',    dot: 'bg-blue-400',    bg: 'bg-blue-400/10 border-blue-400/20' },
  won:     { label: 'Won',            color: 'text-green-400',   dot: 'bg-green-400',   bg: 'bg-green-400/10 border-green-400/20' },
  lost:    { label: 'Lost',           color: 'text-red-400',     dot: 'bg-red-400',     bg: 'bg-red-400/10 border-red-400/20' },
  none:    { label: 'No Opportunity', color: 'text-text-tertiary', dot: 'bg-text-tertiary', bg: 'bg-bg-surface border-border-subtle' },
};

function LeadCard({ lead }: { lead: CrmLead }) {
  const stage = STAGE_CONFIG[lead.opportunity_type || 'none'];

  return (
    <a
      href={lead.close_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-bg-surface border border-border-subtle rounded-lg p-4 hover:border-border-hover transition-all duration-150 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${stage.bg} ${stage.color}`}>
              {lead.opportunity_status || stage.label}
            </span>
            {lead.opportunity_value ? (
              <span className="text-[10px] font-mono text-text-tertiary">
                ${lead.opportunity_value.toLocaleString()}
              </span>
            ) : null}
          </div>

          <div className="font-medium text-sm text-text-primary truncate">{lead.name}</div>

          {lead.contact_name && (
            <div className="text-xs text-text-secondary mt-0.5 truncate">
              {lead.contact_name}
              {lead.contact_email && (
                <span className="text-text-tertiary font-mono ml-1.5">{lead.contact_email}</span>
              )}
            </div>
          )}

          {lead.latest_note && (
            <div className="text-xs text-text-tertiary mt-1.5 line-clamp-1 italic">
              &ldquo;{lead.latest_note}&rdquo;
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] font-mono text-text-tertiary">{timeAgo(lead.date_updated)}</span>
          <svg
            className="w-3.5 h-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </div>
      </div>
    </a>
  );
}

export default function CrmPage() {
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'all' | 'active' | 'won' | 'lost' | 'none'>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crm/pipeline');
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
  }, []);

  useEffect(() => { load(); }, [load]);

  const leads = (() => {
    if (!data) return [];
    const base = view === 'all' ? data.all : (data.groups[view as keyof typeof data.groups] || []);
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (l) =>
        l.name?.toLowerCase().includes(q) ||
        l.contact_name?.toLowerCase().includes(q) ||
        l.contact_email?.toLowerCase().includes(q)
    );
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-text-primary">CRM</h1>
          <p className="text-sm text-text-tertiary mt-0.5">
            Live pipeline from Close CRM — click any lead to open it there
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <a
            href="https://app.close.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary text-white text-sm rounded-lg hover:bg-accent-primary/90 transition-colors"
          >
            Open Close CRM
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      </div>

      {/* Summary stats */}
      {data && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { key: 'all',    label: 'Total',          value: data.summary.total,          color: 'text-text-primary' },
            { key: 'none',   label: 'In Outreach',    value: data.summary.no_opportunity, color: 'text-text-secondary' },
            { key: 'active', label: 'Active Opps',    value: data.summary.active,         color: 'text-blue-400' },
            { key: 'won',    label: 'Won',            value: data.summary.won,            color: 'text-green-400' },
            { key: 'lost',   label: 'Lost',           value: data.summary.lost,           color: 'text-red-400' },
          ].map(({ key, label, value, color }) => (
            <button
              key={key}
              onClick={() => setView(key as typeof view)}
              className={`bg-bg-surface border rounded-lg p-4 text-left transition-all ${
                view === key
                  ? 'border-accent-primary/40 ring-1 ring-accent-primary/20'
                  : 'border-border-subtle hover:border-border-hover'
              }`}
            >
              <div className={`text-2xl font-mono font-semibold ${color}`}>{value}</div>
              <div className="text-xs text-text-tertiary mt-1">{label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company, contact, or email..."
          className="w-full bg-bg-surface border border-border-subtle rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20 transition-colors"
        />
      </div>

      {/* Lead list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-bg-surface border border-border-subtle rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 w-16 bg-bg-surface-hover rounded" />
              </div>
              <div className="h-4 w-48 bg-bg-surface-hover rounded mb-1" />
              <div className="h-3 w-32 bg-bg-surface-hover rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-bg-surface border border-red-400/20 rounded-lg p-6 text-center">
          <p className="text-sm text-red-400 mb-1">Failed to load Close CRM data</p>
          <p className="text-xs text-text-tertiary font-mono">{error}</p>
          <button onClick={load} className="mt-3 text-xs text-accent-primary hover:underline">Try again</button>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-10 text-center">
          <p className="text-sm text-text-secondary">
            {data?.summary.total === 0
              ? 'No ColdCraft leads in Close yet — they\'ll appear here as the pipeline pushes leads.'
              : 'No leads match your filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
