'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Reply, DashboardStats, ReplyCategory, ReplyStatus } from '@/lib/types';

const outcomeConfig: Record<string, { label: string; color: string; bg: string }> = {
  reply_positive: { label: 'Got Response +', color: 'text-green-400', bg: 'bg-green-400/10' },
  reply_negative: { label: 'Got Response -', color: 'text-red-400', bg: 'bg-red-400/10' },
  reply_neutral: { label: 'Neutral Response', color: 'text-text-tertiary', bg: 'bg-bg-surface-hover' },
  silence: { label: 'No Response', color: 'text-text-tertiary', bg: 'bg-bg-surface-hover' },
  meeting_booked: { label: 'Meeting Booked', color: 'text-amber-300', bg: 'bg-amber-400/10' },
};

const categoryConfig: Record<ReplyCategory, { label: string; color: string; bg: string; accent: string }> = {
  interested: { label: 'Interested', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', accent: 'border-l-green-400' },
  soft_no: { label: 'Soft No', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', accent: 'border-l-amber-400' },
  hard_no: { label: 'Hard No', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', accent: 'border-l-red-400' },
  custom: { label: 'Custom', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', accent: 'border-l-blue-400' },
};

const statusConfig: Record<ReplyStatus, { label: string; color: string; dot: string }> = {
  pending: { label: 'Pending', color: 'text-amber-400', dot: 'bg-amber-400' },
  approved: { label: 'Approved', color: 'text-blue-400', dot: 'bg-blue-400' },
  sent: { label: 'Sent', color: 'text-green-400', dot: 'bg-green-400' },
  skipped: { label: 'Skipped', color: 'text-text-tertiary', dot: 'bg-text-tertiary' },
  failed: { label: 'Failed', color: 'text-red-400', dot: 'bg-red-400' },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ConfidenceBar({ confidence, size = 'sm' }: { confidence: number; size?: 'sm' | 'md' }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 90 ? 'bg-green-400' : pct >= 75 ? 'bg-amber-400' : pct >= 50 ? 'bg-orange-400' : 'bg-red-400';
  const w = size === 'md' ? 'w-24' : 'w-14';
  const h = size === 'md' ? 'h-2' : 'h-1.5';
  return (
    <div className="flex items-center gap-2">
      <div className={`${w} ${h} bg-bg-primary rounded-full overflow-hidden`}>
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-mono text-text-tertiary ${size === 'md' ? 'text-xs' : 'text-[10px]'}`}>{pct}%</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="h-4 w-20 bg-bg-surface-hover rounded" />
        <div className="h-4 w-14 bg-bg-surface-hover rounded" />
        <div className="ml-auto h-3 w-16 bg-bg-surface-hover rounded" />
      </div>
      <div className="h-4 w-48 bg-bg-surface-hover rounded mb-1.5" />
      <div className="h-3 w-full bg-bg-surface-hover rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filter, setFilter] = useState<{ status?: string; category?: string }>({});
  const [selectedReply, setSelectedReply] = useState<Reply | null>(null);
  const [editedReply, setEditedReply] = useState('');
  const [showAlternative, setShowAlternative] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showResearch, setShowResearch] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const fetchReplies = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.category) params.set('category', filter.category);
    const res = await fetch(`/api/replies?${params}`);
    const data = await res.json();
    setReplies(data.replies || []);
    setLoading(false);
    setFilterLoading(false);
  }, [filter]);

  const fetchStats = async () => {
    const res = await fetch('/api/replies?stats=true');
    const data = await res.json();
    setStats(data);
  };

  useEffect(() => {
    fetchReplies();
    fetchStats();
  }, [fetchReplies]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchReplies();
      fetchStats();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchReplies]);

  // Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedReply) {
        setSelectedReply(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedReply]);

  const applyFilter = (newFilter: { status?: string; category?: string }) => {
    setFilterLoading(true);
    setFilter(newFilter);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    await fetch(`/api/replies/${id}/approve`, { method: 'POST' });
    await Promise.all([fetchReplies(), fetchStats()]);
    setSelectedReply(null);
    setActionLoading(null);
  };

  const handleRevise = async (id: string) => {
    if (!editedReply.trim()) return;
    setActionLoading(id);
    await fetch(`/api/replies/${id}/revise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revised_reply: editedReply }),
    });
    await Promise.all([fetchReplies(), fetchStats()]);
    setSelectedReply(null);
    setActionLoading(null);
  };

  const handleSkip = async (id: string) => {
    setActionLoading(id);
    await fetch(`/api/replies/${id}/skip`, { method: 'POST' });
    await Promise.all([fetchReplies(), fetchStats()]);
    setSelectedReply(null);
    setActionLoading(null);
  };

  const handleRegenerate = async (id: string) => {
    setActionLoading(id);
    const res = await fetch(`/api/replies/${id}/regenerate`, { method: 'POST' });
    const data = await res.json();
    if (data.success && selectedReply) {
      setSelectedReply({
        ...selectedReply,
        ai_reply: data.reply,
        alternative_reply: data.alternative_reply,
        confidence: data.confidence,
        framework_used: data.framework,
        ai_reasoning: data.reasoning,
      });
      setEditedReply(data.reply);
    }
    setActionLoading(null);
  };

  const handleBook = async (id: string) => {
    setActionLoading(id);
    await fetch(`/api/replies/${id}/book`, { method: 'POST' });
    await Promise.all([fetchReplies(), fetchStats()]);
    if (selectedReply) {
      setSelectedReply({ ...selectedReply, outcome: 'meeting_booked' });
    }
    setActionLoading(null);
  };

  const handleUseAlternative = () => {
    if (selectedReply?.alternative_reply) {
      setEditedReply(selectedReply.alternative_reply);
      setShowAlternative(false);
    }
  };

  const openReply = (reply: Reply) => {
    setSelectedReply(reply);
    setEditedReply(reply.ai_reply || '');
    setShowAlternative(false);
    setShowResearch(false);
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
          {[
            { label: 'Total', value: stats.total, color: 'text-text-primary', labelColor: 'text-text-tertiary' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-400', labelColor: 'text-amber-400/60' },
            { label: 'Sent', value: stats.sent, color: 'text-green-400', labelColor: 'text-green-400/60' },
            { label: 'Auto-Sent', value: stats.auto_sent, color: 'text-purple-400', labelColor: 'text-purple-400/60' },
            { label: 'Confidence', value: `${Math.round(stats.avg_confidence * 100)}%`, color: 'text-accent-primary', labelColor: 'text-accent-primary/60' },
            { label: 'Speed', value: stats.avg_response_time_ms ? `${(stats.avg_response_time_ms / 1000).toFixed(0)}s` : '--', color: 'text-text-secondary', labelColor: 'text-text-tertiary' },
            ...(stats.outcomes && (stats.outcomes.reply_positive > 0 || stats.outcomes.meeting_booked > 0 || stats.outcomes.silence > 0)
              ? [{ label: 'Win Rate', value: `${Math.round(stats.outcomes.win_rate * 100)}%`, color: 'text-green-400', labelColor: 'text-green-400/60' }]
              : []),
          ].map(({ label, value, color, labelColor }, i) => (
            <div
              key={label}
              className="bg-bg-surface border border-border-subtle rounded-lg px-3.5 py-3 animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={`font-mono text-[9px] tracking-wider uppercase ${labelColor}`}>{label}</div>
              <div className={`text-xl font-bold ${color} mt-0.5 tabular-nums`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Category breakdown - compact row */}
      {stats && (stats.by_category.interested > 0 || stats.by_category.soft_no > 0 || stats.by_category.hard_no > 0) && (
        <div className="flex items-center gap-5 px-0.5">
          {[
            { label: 'Interested', count: stats.by_category.interested, color: 'text-green-400', bar: 'bg-green-400' },
            { label: 'Soft No', count: stats.by_category.soft_no, color: 'text-amber-400', bar: 'bg-amber-400' },
            { label: 'Hard No', count: stats.by_category.hard_no, color: 'text-red-400', bar: 'bg-red-400' },
            { label: 'Failed', count: stats.failed, color: 'text-red-400/60', bar: 'bg-red-400/40' },
          ].filter(c => c.count > 0).map(c => (
            <div key={c.label} className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${c.bar}`} />
              <span className="text-[10px] font-mono text-text-tertiary">{c.label}</span>
              <span className={`text-[10px] font-mono font-medium ${c.color}`}>{c.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-1.5 flex-wrap py-1">
        <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider mr-0.5">Status</span>
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'sent', label: 'Sent' },
          { key: 'failed', label: 'Failed' },
        ].map((f) => {
          const isActive = (f.key === 'all' && !filter.status) || filter.status === f.key;
          return (
            <button
              key={f.key}
              onClick={() => applyFilter({ ...filter, status: f.key === 'all' ? undefined : f.key })}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all duration-150 ${
                isActive
                  ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/25'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover/50'
              }`}
            >
              {f.label}
            </button>
          );
        })}

        <div className="w-px h-3.5 bg-border-subtle mx-1.5" />
        <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider mr-0.5">Type</span>

        {(Object.entries(categoryConfig) as [ReplyCategory, typeof categoryConfig.interested][]).map(
          ([key, cfg]) => {
            const isActive = filter.category === key;
            return (
              <button
                key={key}
                onClick={() => applyFilter({ ...filter, category: isActive ? undefined : key })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all duration-150 ${
                  isActive
                    ? `${cfg.bg} ${cfg.color} border`
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover/50'
                }`}
              >
                {cfg.label}
              </button>
            );
          }
        )}

        {(filter.status || filter.category) && (
          <button
            onClick={() => applyFilter({})}
            className="px-2 py-1 rounded-md text-[10px] font-mono text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover/50 transition-colors ml-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Reply List */}
      <div key={`${filter.status || 'all'}-${filter.category || 'all'}`} className="space-y-1.5 animate-fade-in">
        {loading ? (
          <div className="space-y-1.5">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filterLoading ? (
          <div className="space-y-1.5">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : replies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full bg-bg-surface border border-border-subtle flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
              </svg>
            </div>
            <div className="text-text-secondary text-sm font-medium mb-1">
              {filter.status || filter.category ? 'No replies match this filter' : 'No replies yet'}
            </div>
            {!filter.status && !filter.category && (
              <div className="text-xs text-text-tertiary">
                Webhook:{' '}
                <code className="font-mono bg-bg-surface px-1.5 py-0.5 rounded text-accent-primary/80 text-[11px]">
                  /api/webhooks/instantly
                </code>
              </div>
            )}
          </div>
        ) : (
          replies.map((reply) => {
            const cat = categoryConfig[reply.category];
            const stat = statusConfig[reply.status];
            const hasDraft = reply.ai_reply && reply.status === 'pending';
            return (
              <button
                key={reply.id}
                onClick={() => openReply(reply)}
                className={`w-full text-left bg-bg-surface border border-border-subtle rounded-lg px-4 py-3.5 hover:border-border-hover hover:bg-bg-surface-hover/30 hover:-translate-y-px hover:shadow-lg hover:shadow-black/20 transition-all duration-150 border-l-2 ${cat.accent} group`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Name + company */}
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span className="text-[13px] text-text-primary font-medium truncate">
                        {reply.lead_name || reply.lead_email}
                      </span>
                      {reply.lead_company && (
                        <span className="text-xs text-text-tertiary truncate">{reply.lead_company}</span>
                      )}
                    </div>

                    {/* Message preview */}
                    <div className="text-xs text-text-secondary line-clamp-1 mb-2">{reply.original_message}</div>

                    {/* Bottom row: badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${cat.bg} ${cat.color} border`}>
                        {reply.sub_category
                          ? reply.sub_category.split('.')[1].replace(/_/g, ' ')
                          : cat.label}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`w-1 h-1 rounded-full ${stat.dot}`} />
                        <span className={`text-[10px] font-mono ${stat.color}`}>{stat.label}</span>
                      </span>
                      {reply.auto_sent && (
                        <span className="text-[10px] font-mono text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">
                          Auto
                        </span>
                      )}
                      {reply.outcome && outcomeConfig[reply.outcome] && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${outcomeConfig[reply.outcome].bg} ${outcomeConfig[reply.outcome].color}`}>
                          {outcomeConfig[reply.outcome].label}
                        </span>
                      )}
                      {reply.confidence > 0 && <ConfidenceBar confidence={reply.confidence} />}
                    </div>
                  </div>

                  {/* Right side: time + draft indicator */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[10px] text-text-tertiary font-mono">{timeAgo(reply.created_at)}</span>
                    {hasDraft && (
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
                        <span className="text-[9px] font-mono text-accent-primary">Draft</span>
                      </div>
                    )}
                    {reply.framework_used && (
                      <span className="text-[9px] font-mono text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                        {reply.framework_used}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Reply Detail Modal */}
      {selectedReply && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-backdrop-in"
          onClick={(e) => e.target === e.currentTarget && setSelectedReply(null)}
        >
          <div
            ref={modalRef}
            className="bg-bg-surface border border-border-subtle rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50 animate-scale-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border-subtle sticky top-0 bg-bg-surface/95 backdrop-blur-sm z-10 rounded-t-xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border ${categoryConfig[selectedReply.category].bg} ${categoryConfig[selectedReply.category].color}`}>
                    {selectedReply.sub_category
                      ? selectedReply.sub_category.replace('.', ' / ').replace(/_/g, ' ')
                      : categoryConfig[selectedReply.category].label}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[selectedReply.status].dot}`} />
                    <span className={`text-xs font-mono ${statusConfig[selectedReply.status].color}`}>
                      {statusConfig[selectedReply.status].label}
                    </span>
                  </span>
                  {selectedReply.auto_sent && (
                    <span className="text-xs font-mono text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded">
                      Auto-sent{selectedReply.auto_send_reason ? ` (${selectedReply.auto_send_reason})` : ''}
                    </span>
                  )}
                  {selectedReply.outcome && outcomeConfig[selectedReply.outcome] && (
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${outcomeConfig[selectedReply.outcome].bg} ${outcomeConfig[selectedReply.outcome].color}`}>
                      {outcomeConfig[selectedReply.outcome].label}
                    </span>
                  )}
                  {selectedReply.confidence > 0 && <ConfidenceBar confidence={selectedReply.confidence} size="md" />}
                  {selectedReply.framework_used && (
                    <span className="text-[10px] font-mono text-text-tertiary bg-bg-primary px-2 py-0.5 rounded">
                      {selectedReply.framework_used}
                    </span>
                  )}
                </div>
                <h2 className="text-lg text-text-primary font-medium truncate">
                  {selectedReply.lead_name || selectedReply.lead_email}
                </h2>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {selectedReply.lead_company && (
                    <span className="text-sm text-text-secondary">{selectedReply.lead_company}</span>
                  )}
                  <span className="text-xs text-text-tertiary font-mono">{selectedReply.lead_email}</span>
                  {selectedReply.response_time_ms && (
                    <span className="text-[10px] text-text-tertiary font-mono">
                      {(selectedReply.response_time_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                  <span className="text-[10px] text-text-tertiary font-mono">{timeAgo(selectedReply.created_at)}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedReply(null)}
                className="text-text-tertiary hover:text-text-primary p-1.5 hover:bg-bg-surface-hover rounded-lg transition-colors ml-3"
                title="Close (Esc)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* AI Reasoning */}
              {selectedReply.ai_reasoning && (
                <div className="bg-accent-glow border border-accent-primary/10 rounded-lg p-3.5">
                  <div className="font-mono text-[9px] tracking-wider uppercase text-accent-primary mb-1.5">AI Reasoning</div>
                  <div className="text-xs text-text-secondary leading-relaxed">{selectedReply.ai_reasoning}</div>
                </div>
              )}

              {/* Original Message */}
              <div>
                <div className="font-mono text-[9px] tracking-wider uppercase text-text-tertiary mb-1.5">Prospect&apos;s Reply</div>
                <div className="bg-bg-primary border border-border-subtle rounded-lg p-4 text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                  {selectedReply.original_message}
                </div>
              </div>

              {/* Research Toggle */}
              {selectedReply.research_data && (
                <div>
                  <button
                    onClick={() => setShowResearch(!showResearch)}
                    className="flex items-center gap-2 text-xs text-accent-primary hover:text-accent-primary-hover transition-colors py-1"
                  >
                    <svg className={`w-3 h-3 transition-transform duration-200 ${showResearch ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    {showResearch ? 'Hide' : 'Show'} Lead Intelligence
                  </button>
                  {showResearch && (
                    <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {[
                        { label: 'Company', data: selectedReply.research_data.company_overview, color: 'text-green-400' },
                        { label: 'Pain Signals', data: selectedReply.research_data.pain_signals, color: 'text-red-400' },
                        { label: 'Opportunity', data: selectedReply.research_data.opportunity_signals, color: 'text-amber-400' },
                        { label: 'Connection Points', data: selectedReply.research_data.connection_points, color: 'text-accent-primary' },
                      ].map(section => (
                        <div key={section.label} className="bg-bg-primary border border-border-subtle rounded-lg p-3">
                          <div className={`font-mono text-[9px] tracking-wider uppercase ${section.color} mb-1.5`}>{section.label}</div>
                          <div className="text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed">{section.data}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AI Reply / Editor */}
              {selectedReply.ai_reply && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-mono text-[9px] tracking-wider uppercase text-text-tertiary">
                      {selectedReply.status === 'pending' ? 'AI Draft' : 'Reply Sent'}
                    </div>
                    {selectedReply.status === 'pending' && (
                      <div className="flex items-center gap-3">
                        {selectedReply.alternative_reply && (
                          <button
                            onClick={() => setShowAlternative(!showAlternative)}
                            className="text-[10px] font-mono text-accent-primary hover:text-accent-primary-hover transition-colors"
                          >
                            {showAlternative ? 'Hide alt' : 'Alt version'}
                          </button>
                        )}
                        <button
                          onClick={() => handleRegenerate(selectedReply.id)}
                          disabled={actionLoading === selectedReply.id}
                          className="text-[10px] font-mono text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          <svg className={`w-3 h-3 ${actionLoading === selectedReply.id ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992" />
                          </svg>
                          {actionLoading === selectedReply.id ? 'Working...' : 'Regenerate'}
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedReply.status === 'pending' ? (
                    <textarea
                      value={editedReply}
                      onChange={(e) => setEditedReply(e.target.value)}
                      rows={6}
                      className="w-full bg-bg-primary border border-border-subtle rounded-lg p-4 text-sm text-text-primary resize-y focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20 transition-colors leading-relaxed"
                    />
                  ) : (
                    <div className="bg-bg-primary border border-border-subtle rounded-lg p-4 text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                      {selectedReply.final_reply || selectedReply.ai_reply}
                    </div>
                  )}

                  {/* Alternative Reply */}
                  {showAlternative && selectedReply.alternative_reply && (
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-mono text-[9px] tracking-wider uppercase text-text-tertiary">Alternative Angle</div>
                        <button
                          onClick={handleUseAlternative}
                          className="text-[10px] font-mono text-accent-primary hover:text-accent-primary-hover transition-colors"
                        >
                          Use this instead
                        </button>
                      </div>
                      <div className="bg-bg-primary border border-accent-primary/15 rounded-lg p-4 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                        {selectedReply.alternative_reply}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata row */}
              {(selectedReply.knowledge_used || selectedReply.tone || selectedReply.urgency) && (
                <div className="flex items-center gap-4 text-[10px] text-text-tertiary font-mono flex-wrap">
                  {selectedReply.knowledge_used && <span>KB: {selectedReply.knowledge_used}</span>}
                  {selectedReply.tone && <span>Tone: {selectedReply.tone}</span>}
                  {selectedReply.urgency && <span>Urgency: {selectedReply.urgency}</span>}
                </div>
              )}

              {/* Mark as Booked — for sent replies */}
              {selectedReply.status === 'sent' && selectedReply.outcome !== 'meeting_booked' && (
                <div className="pt-3 border-t border-border-subtle">
                  <button
                    onClick={() => handleBook(selectedReply.id)}
                    disabled={actionLoading === selectedReply.id}
                    className="bg-amber-400/10 border border-amber-400/20 text-amber-300 hover:bg-amber-400/20 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 disabled:opacity-50"
                  >
                    {actionLoading === selectedReply.id ? 'Saving...' : 'Mark as Meeting Booked'}
                  </button>
                </div>
              )}

              {/* Actions */}
              {selectedReply.status === 'pending' && selectedReply.ai_reply && (
                <div className="flex items-center gap-2 pt-4 border-t border-border-subtle">
                  <button
                    onClick={() => handleApprove(selectedReply.id)}
                    disabled={actionLoading === selectedReply.id}
                    className="flex-1 bg-green-500 text-white hover:bg-green-500/90 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 disabled:opacity-50"
                  >
                    {actionLoading === selectedReply.id ? 'Sending...' : 'Approve & Send'}
                  </button>
                  <button
                    onClick={() => handleRevise(selectedReply.id)}
                    disabled={actionLoading === selectedReply.id || editedReply === selectedReply.ai_reply}
                    className="flex-1 bg-accent-primary/10 border border-accent-primary/20 text-accent-primary hover:bg-accent-primary/20 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 disabled:opacity-50"
                  >
                    {actionLoading === selectedReply.id ? 'Sending...' : 'Revise & Train'}
                  </button>
                  <button
                    onClick={() => handleSkip(selectedReply.id)}
                    disabled={actionLoading === selectedReply.id}
                    className="bg-bg-primary border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-hover rounded-lg px-4 py-2.5 text-sm transition-all duration-150 disabled:opacity-50"
                  >
                    Skip
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
