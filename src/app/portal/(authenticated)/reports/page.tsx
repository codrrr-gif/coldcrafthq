'use client';

import { useState, useEffect } from 'react';
import type { Report } from '@/lib/portal/types';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/reports')
      .then((r) => r.json())
      .then((data) => { setReports(data.reports); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-text-secondary text-sm">Loading reports...</div>;

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <h1 className="font-display text-xl text-text-primary mb-6">Reports</h1>

      {selected ? (
        <div>
          <button onClick={() => setSelected(null)} className="text-sm text-accent-primary hover:underline mb-4">&larr; Back to reports</button>
          <div className="bg-bg-surface border border-border-subtle rounded-lg p-6">
            <h2 className="font-display text-lg text-text-primary mb-1">{selected.type === 'weekly' ? 'Weekly' : 'Monthly'} Report</h2>
            <p className="text-xs text-text-tertiary font-mono mb-6">{fmtDate(selected.period_start)} — {fmtDate(selected.period_end)}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><p className="mono-label">Meetings Booked</p><p className="text-xl text-text-primary">{selected.metrics.meetings_booked}</p></div>
              <div><p className="mono-label">Reply Rate</p><p className="text-xl text-text-primary">{selected.metrics.reply_rate}%</p></div>
              <div><p className="mono-label">Leads Contacted</p><p className="text-xl text-text-primary">{selected.metrics.leads_contacted}</p></div>
              <div><p className="mono-label">Cost Per Meeting</p><p className="text-xl text-text-primary">{selected.metrics.cost_per_meeting > 0 ? `$${(selected.metrics.cost_per_meeting / 100).toFixed(0)}` : '-'}</p></div>
              <div><p className="mono-label">Campaign Health</p><p className="text-xl text-text-primary">{selected.metrics.campaign_health}%</p></div>
              <div><p className="mono-label">AI Confidence</p><p className="text-xl text-text-primary">{selected.metrics.ai_confidence_avg}%</p></div>
              <div><p className="mono-label">Pipeline Value</p><p className="text-xl text-text-primary">{selected.metrics.pipeline_value > 0 ? `$${(selected.metrics.pipeline_value / 100).toLocaleString()}` : '-'}</p></div>
            </div>
          </div>
        </div>
      ) : reports.length === 0 ? (
        <p className="text-text-secondary text-sm">No reports generated yet. Reports are sent weekly on Mondays and monthly on the 1st.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="w-full text-left bg-bg-surface border border-border-subtle rounded-lg p-4 hover:bg-bg-surface-hover transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm text-text-primary">{r.type === 'weekly' ? 'Weekly' : 'Monthly'} Report</h3>
                  <p className="text-xs text-text-tertiary font-mono">{fmtDate(r.period_start)} — {fmtDate(r.period_end)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-display text-text-primary">{r.metrics.meetings_booked}</p>
                  <p className="text-xs text-text-tertiary">meetings</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
