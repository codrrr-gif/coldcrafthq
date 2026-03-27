'use client';

import { useState, useEffect, useCallback } from 'react';

interface VoiceCall {
  id: string;
  lead_id: string | null;
  vapi_call_id: string | null;
  phone_number: string | null;
  status: string;
  duration_s: number | null;
  transcript: string | null;
  outcome: string | null;
  called_at: string;
  ended_at: string | null;
  pipeline_leads: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    company_name: string | null;
    signal_type: string | null;
  } | null;
}

interface Stats {
  total: number;
  completed: number;
  interested: number;
  callbacks: number;
  no_answer: number;
  connect_rate: string;
  interest_rate: string;
}

const outcomeColors: Record<string, string> = {
  interested: 'bg-green-500/10 text-green-400 border-green-500/20',
  meeting_booked: 'bg-green-500/10 text-green-400 border-green-500/20',
  callback_requested: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  not_interested: 'bg-red-500/10 text-red-400 border-red-500/20',
  voicemail: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  wrong_number: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  no_answer: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  initiated: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  scheduled: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function VoicePage() {
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadCalls = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter) params.set('outcome', filter);
    const res = await fetch(`/api/voice/calls?${params}`);
    if (res.ok) {
      const data = await res.json();
      setCalls(data.calls);
      setStats(data.stats);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadCalls(); }, [loadCalls]);

  const filters = [
    { label: 'All', value: null },
    { label: 'Interested', value: 'interested' },
    { label: 'Callback', value: 'callback_requested' },
    { label: 'Not Interested', value: 'not_interested' },
    { label: 'Voicemail', value: 'voicemail' },
    { label: 'No Answer', value: 'no_answer' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display text-text-primary">Voice Calls</h1>
          <p className="text-sm text-text-secondary mt-1">
            AI-powered follow-up calls via Vapi — transcripts, outcomes, and CRM sync.
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Calls', value: stats.total },
            { label: 'Connected', value: `${stats.completed} (${stats.connect_rate}%)` },
            { label: 'Interested', value: `${stats.interested} (${stats.interest_rate}%)` },
            { label: 'Callbacks', value: stats.callbacks },
          ].map((s) => (
            <div key={s.label} className="bg-bg-surface border border-border-subtle rounded-lg p-4">
              <div className="text-2xl font-mono text-text-primary">{s.value}</div>
              <div className="text-xs text-text-tertiary mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-tertiary">Outcome:</span>
        {filters.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
              filter === f.value
                ? 'bg-bg-surface-hover text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Calls List */}
      {loading ? (
        <div className="text-text-secondary text-sm">Loading calls...</div>
      ) : calls.length === 0 ? (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-12 text-center">
          <div className="text-text-tertiary text-sm">
            No voice calls yet. Calls are triggered automatically 5 days after leads are pushed to campaigns.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <div
              key={call.id}
              className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden"
            >
              {/* Call row */}
              <button
                onClick={() => setExpanded(expanded === call.id ? null : call.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary font-medium truncate">
                      {call.pipeline_leads?.first_name || 'Unknown'}{' '}
                      {call.pipeline_leads?.last_name || ''}
                      {call.pipeline_leads?.company_name && (
                        <span className="text-text-tertiary font-normal">
                          {' '}at {call.pipeline_leads.company_name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-tertiary font-mono mt-0.5">
                      {call.phone_number || 'No number'} · {formatTime(call.called_at)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-text-tertiary font-mono">
                    {formatDuration(call.duration_s)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded border text-xs font-mono ${
                      outcomeColors[call.outcome || call.status] || outcomeColors.no_answer
                    }`}
                  >
                    {(call.outcome || call.status).replaceAll('_', ' ')}
                  </span>
                  <svg
                    className={`w-4 h-4 text-text-tertiary transition-transform ${
                      expanded === call.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </button>

              {/* Expanded transcript */}
              {expanded === call.id && (
                <div className="px-4 pb-4 border-t border-border-subtle">
                  <div className="mt-3 space-y-3">
                    {/* Lead details */}
                    <div className="flex gap-4 text-xs text-text-tertiary font-mono">
                      {call.pipeline_leads?.email && <span>{call.pipeline_leads.email}</span>}
                      {call.pipeline_leads?.signal_type && (
                        <span>Signal: {call.pipeline_leads.signal_type}</span>
                      )}
                      {call.vapi_call_id && <span>ID: {call.vapi_call_id.slice(0, 8)}...</span>}
                    </div>

                    {/* Transcript */}
                    {call.transcript ? (
                      <div>
                        <div className="text-xs text-text-tertiary mb-1">Transcript</div>
                        <div className="bg-bg-primary rounded-md p-3 text-sm text-text-secondary font-mono leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap">
                          {call.transcript}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-text-tertiary italic">No transcript available</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
