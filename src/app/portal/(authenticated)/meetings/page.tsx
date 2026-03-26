'use client';

import { useState, useEffect } from 'react';
import type { Meeting } from '@/lib/portal/types';

const statusBadge: Record<string, { label: string; cls: string }> = {
  upcoming: { label: 'Upcoming', cls: 'bg-blue-400/10 text-blue-400' },
  completed: { label: 'Completed', cls: 'bg-green-400/10 text-green-400' },
  no_show: { label: 'No Show', cls: 'bg-red-400/10 text-red-400' },
  converted: { label: 'Converted', cls: 'bg-amber-400/10 text-amber-400' },
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/meetings')
      .then((r) => r.json())
      .then((data) => { setMeetings(data.meetings); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-text-secondary text-sm">Loading meetings...</div>;

  return (
    <div>
      <h1 className="font-display text-xl text-text-primary mb-6">Meetings</h1>

      {meetings.length === 0 ? (
        <p className="text-text-secondary text-sm">No meetings booked yet.</p>
      ) : (
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-3 mono-label">Prospect</th>
                <th className="text-left px-4 py-3 mono-label">Company</th>
                <th className="text-left px-4 py-3 mono-label">Date</th>
                <th className="text-left px-4 py-3 mono-label">Source</th>
                <th className="text-left px-4 py-3 mono-label">Status</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-4 py-3 text-text-primary">{m.prospect_name}</td>
                  <td className="px-4 py-3 text-text-secondary">{m.prospect_company || '-'}</td>
                  <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                    {new Date(m.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-text-tertiary text-xs">{m.source_signal || m.source_campaign || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusBadge[m.status]?.cls}`}>
                      {statusBadge[m.status]?.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
