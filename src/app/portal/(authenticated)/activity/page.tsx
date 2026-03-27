'use client';

import { useState, useEffect } from 'react';
import type { ActivityEntry } from '@/lib/portal/types';

const typeIcons: Record<string, string> = {
  campaign_launched: '🚀',
  leads_pushed: '📤',
  reply_received: '💬',
  meeting_booked: '🎯',
  report_generated: '📊',
  health_alert: '⚠️',
  onboarding_step: '✅',
  request_update: '📋',
  system: 'ℹ️',
};

const typeFilters = [
  { value: 'all', label: 'All' },
  { value: 'meeting_booked', label: 'Meetings' },
  { value: 'reply_received', label: 'Replies' },
  { value: 'leads_pushed', label: 'Campaigns' },
  { value: 'report_generated', label: 'Reports' },
  { value: 'system', label: 'System' },
];

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (filter !== 'all') params.set('type', filter);

    fetch(`/api/portal/activity?${params}`)
      .then((r) => r.json())
      .then((data) => { setEntries(data.entries); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <h1 className="font-display text-xl text-text-primary mb-6">Activity</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {typeFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              filter === f.value
                ? 'bg-accent-primary text-white'
                : 'bg-bg-surface text-text-secondary hover:text-text-primary border border-border-subtle'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-bg-surface border border-border-subtle rounded-lg p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-text-secondary text-sm">No activity yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-bg-surface border border-border-subtle rounded-lg px-4 py-3 flex items-start gap-3">
              <span className="text-lg">{typeIcons[entry.type] || 'ℹ️'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">{entry.title}</p>
                {entry.detail && <p className="text-xs text-text-tertiary mt-0.5">{entry.detail}</p>}
              </div>
              <span className="text-xs text-text-tertiary font-mono whitespace-nowrap">{timeAgo(entry.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
