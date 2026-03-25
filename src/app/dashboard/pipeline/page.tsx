'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PipelineLead, PipelineStatus } from '@/lib/gtm/types';

const STATUS_CONFIG: Record<PipelineStatus, { label: string; color: string; dot: string }> = {
  pending:          { label: 'Pending',         color: 'text-text-tertiary',  dot: 'bg-text-tertiary' },
  finding_contact:  { label: 'Finding contact', color: 'text-blue-400',       dot: 'bg-blue-400 animate-pulse' },
  finding_email:    { label: 'Finding email',   color: 'text-blue-400',       dot: 'bg-blue-400 animate-pulse' },
  verifying:        { label: 'Verifying',        color: 'text-amber-400',      dot: 'bg-amber-400 animate-pulse' },
  researching:      { label: 'Researching',      color: 'text-purple-400',     dot: 'bg-purple-400 animate-pulse' },
  ready:            { label: 'Ready',            color: 'text-cyan-400',       dot: 'bg-cyan-400' },
  pushed:           { label: 'Pushed',           color: 'text-green-400',      dot: 'bg-green-400' },
  failed:           { label: 'Failed',           color: 'text-red-400',        dot: 'bg-red-400' },
  research_failed:  { label: 'Research failed',  color: 'text-red-400',        dot: 'bg-red-400' },
  opted_out:        { label: 'Opted out',        color: 'text-text-tertiary',  dot: 'bg-text-tertiary/50' },
  meeting:          { label: 'Meeting',          color: 'text-emerald-400',    dot: 'bg-emerald-400' },
  contacted:        { label: 'Contacted',        color: 'text-blue-400',       dot: 'bg-blue-400' },
  replied:          { label: 'Replied',          color: 'text-cyan-400',       dot: 'bg-cyan-400' },
  won:              { label: 'Won',              color: 'text-emerald-400',    dot: 'bg-emerald-400' },
  filtered:         { label: 'Filtered',         color: 'text-text-tertiary',  dot: 'bg-text-tertiary/50' },
};

const SIGNAL_LABELS: Record<string, string> = {
  funding: 'Funding',
  job_posting: 'Job posting',
  leadership_change: 'Leadership change',
  news: 'News',
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [actorStatus, setActorStatus] = useState<'idle' | 'running' | 'complete'>('idle');
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  const loadLeads = useCallback(async () => {
    const res = await fetch('/api/pipeline/leads?limit=100');
    const data = await res.json();
    if (res.ok) setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // Start Apify ingestion
  const triggerIngest = useCallback(async () => {
    setIngesting(true);
    setActorStatus('running');
    await fetch('/api/pipeline/ingest', { method: 'POST' });
    setIngesting(false);

    // Poll check endpoint until actors complete
    pollRef.current = setInterval(async () => {
      const res = await fetch('/api/pipeline/check', { method: 'POST' });
      const data = await res.json();
      await loadLeads();
      if (data.status === 'complete') {
        clearInterval(pollRef.current!);
        setActorStatus('complete');
      }
    }, 15000); // check every 15s
  }, [loadLeads]);

  // Client-driven processing loop — sequential to prevent pileup.
  // Each call awaits the previous before firing the next; /process can take
  // up to 300s so we must NOT use setInterval here.
  const startProcessing = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const res = await fetch('/api/pipeline/process', { method: 'POST' });
        const data = await res.json();
        await loadLeads();
        if (data.status === 'idle' || !processingRef.current) break;
      } catch {
        break;
      }
    }
    processingRef.current = false;
    setProcessing(false);
  }, [loadLeads]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    processingRef.current = false; // signal the sequential loop to stop on unmount
  }, []);

  // Stats
  const stats = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pendingCount = stats.pending || 0;
  const activeCount = (stats.finding_contact || 0) + (stats.finding_email || 0) +
    (stats.verifying || 0) + (stats.researching || 0);
  const pushedCount = stats.pushed || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-display text-text-primary">Signal Pipeline</h1>
          <p className="text-sm text-text-tertiary mt-1">
            Daily signal scraping → contact enrichment → email finding → Instantly push.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={triggerIngest}
            disabled={ingesting || actorStatus === 'running'}
            className="px-4 py-2 text-sm bg-bg-surface border border-border-subtle text-text-secondary rounded-lg hover:text-text-primary disabled:opacity-50 transition-colors"
          >
            {ingesting ? 'Starting scrapers...' : actorStatus === 'running' ? 'Scrapers running...' : 'Run scrapers'}
          </button>
          <button
            onClick={startProcessing}
            disabled={processing || pendingCount === 0}
            className="px-4 py-2 text-sm bg-accent-primary text-bg-primary font-medium rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 transition-colors"
          >
            {processing ? `Enriching... (${activeCount} active)` : `Enrich ${pendingCount} leads`}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending',  value: pendingCount,                  color: 'text-text-secondary' },
          { label: 'Active',   value: activeCount,                   color: 'text-blue-400' },
          { label: 'Pushed',   value: pushedCount,                   color: 'text-green-400' },
          { label: 'Failed',   value: (stats.failed || 0) + (stats.filtered || 0), color: 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-bg-surface border border-border-subtle rounded-lg p-4">
            <div className={`text-2xl font-display ${s.color}`}>{s.value}</div>
            <div className="text-xs text-text-tertiary mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Leads table */}
      {loading ? (
        <div className="text-sm text-text-tertiary text-center py-8">Loading...</div>
      ) : leads.length === 0 ? (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-8 text-center">
          <p className="text-sm text-text-secondary">No leads yet.</p>
          <p className="text-xs text-text-tertiary mt-1">Run scrapers to pull today&apos;s signals.</p>
        </div>
      ) : (
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_120px_140px] gap-3 px-4 py-2.5 bg-bg-surface-hover text-[10px] uppercase tracking-wider text-text-tertiary border-b border-border-subtle">
            <span>Company</span>
            <span>Contact</span>
            <span>Signal</span>
            <span>Score</span>
            <span>Status</span>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-border-subtle">
            {leads.map((lead) => {
              const sc = STATUS_CONFIG[lead.status];
              return (
                <div
                  key={lead.id}
                  className="grid grid-cols-[1.5fr_1fr_1fr_120px_140px] gap-3 px-4 py-3 text-sm hover:bg-bg-surface-hover/50 transition-colors"
                >
                  <div>
                    <div className="text-text-primary font-medium truncate">{lead.company_name || lead.company_domain}</div>
                    <div className="text-xs text-text-tertiary font-mono truncate">{lead.company_domain}</div>
                  </div>
                  <div>
                    {lead.first_name ? (
                      <>
                        <div className="text-text-secondary truncate">{lead.first_name} {lead.last_name}</div>
                        <div className="text-xs text-text-tertiary truncate">{lead.title}</div>
                      </>
                    ) : (
                      <span className="text-text-tertiary text-xs">Not found yet</span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary">{SIGNAL_LABELS[lead.signal_type || ''] || lead.signal_type}</div>
                    <div className="text-xs text-text-tertiary truncate mt-0.5">{timeAgo(lead.created_at)}</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-14 h-1.5 bg-bg-primary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          (lead.signal_score || 0) >= 80 ? 'bg-green-400' :
                          (lead.signal_score || 0) >= 60 ? 'bg-amber-400' : 'bg-text-tertiary'
                        }`}
                        style={{ width: `${lead.signal_score || 0}%` }}
                      />
                    </div>
                    <span className="ml-2 text-xs font-mono text-text-tertiary">{lead.signal_score}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                    <span className={`text-xs ${sc.color}`}>{sc.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
