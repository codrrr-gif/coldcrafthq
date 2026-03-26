'use client';

import { useState, useEffect } from 'react';

interface DashboardMetrics {
  leads_contacted_week: number;
  leads_contacted_month: number;
  reply_rate: number;
  reply_rate_trend: number;
  meetings_booked: number;
  meetings_trend: number;
  pipeline_value: number;
  cost_per_meeting: number;
  campaign_health: number;
  bounce_rate: number;
  ai_confidence: number;
}

function TrendArrow({ value }: { value: number }) {
  if (value > 0) return <span className="text-green-400 text-xs ml-1">+{Math.round(value * 100)}%</span>;
  if (value < 0) return <span className="text-red-400 text-xs ml-1">{Math.round(value * 100)}%</span>;
  return <span className="text-text-tertiary text-xs ml-1">-</span>;
}

function MetricCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: number }) {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
      <p className="mono-label mb-2">{label}</p>
      <p className="text-2xl font-display text-text-primary">
        {value}
        {trend !== undefined && <TrendArrow value={trend} />}
      </p>
      {sub && <p className="text-xs text-text-tertiary mt-1">{sub}</p>}
    </div>
  );
}

export default function PortalDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/dashboard')
      .then((res) => res.json())
      .then((data) => { setMetrics(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-bg-surface border border-border-subtle rounded-lg p-5 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (!metrics) {
    return <p className="text-text-secondary">Failed to load dashboard data.</p>;
  }

  const fmt = (n: number) => n.toLocaleString();
  const fmtUsd = (cents: number) => `$${(cents / 100).toLocaleString()}`;

  return (
    <div>
      <h1 className="font-display text-xl text-text-primary mb-6">Campaign Performance</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Meetings Booked"
          value={fmt(metrics.meetings_booked)}
          sub="This month"
          trend={metrics.meetings_trend > 0 ? metrics.meetings_trend / Math.max(metrics.meetings_booked - metrics.meetings_trend, 1) : 0}
        />
        <MetricCard label="Reply Rate" value={`${metrics.reply_rate}%`} trend={metrics.reply_rate_trend} />
        <MetricCard label="Leads Contacted" value={fmt(metrics.leads_contacted_week)} sub="This week" />
        <MetricCard label="Leads This Month" value={fmt(metrics.leads_contacted_month)} />
        <MetricCard label="Cost Per Meeting" value={metrics.cost_per_meeting > 0 ? fmtUsd(metrics.cost_per_meeting) : '-'} />
        <MetricCard label="Campaign Health" value={`${metrics.campaign_health}%`} sub={`Bounce: ${metrics.bounce_rate}%`} />
        <MetricCard label="AI Confidence" value={`${metrics.ai_confidence}%`} sub="Avg reply engine confidence" />
        <MetricCard label="Pipeline Value" value={metrics.pipeline_value > 0 ? fmtUsd(metrics.pipeline_value) : '-'} />
      </div>
    </div>
  );
}
