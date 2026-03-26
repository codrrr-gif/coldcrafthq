'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Client } from '@/lib/portal/types';

const statusBadge: Record<string, { label: string; cls: string }> = {
  onboarding: { label: 'Onboarding', cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  active: { label: 'Active', cls: 'bg-green-400/10 text-green-400 border-green-400/20' },
  paused: { label: 'Paused', cls: 'bg-bg-surface-hover text-text-tertiary border-border-subtle' },
  churned: { label: 'Churned', cls: 'bg-red-400/10 text-red-400 border-red-400/20' },
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then((data) => { setClients(data.clients); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalMRR = clients.filter((c) => c.status === 'active').reduce((sum, c) => sum + c.monthly_retainer, 0);

  if (loading) return <div className="text-text-secondary text-sm">Loading clients...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl text-text-primary">Clients</h1>
          <p className="text-sm text-text-tertiary mt-1">
            {clients.length} clients — ${(totalMRR / 100).toLocaleString()}/mo MRR
          </p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium rounded-md"
        >
          Add Client
        </Link>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left px-4 py-3 mono-label">Client</th>
              <th className="text-left px-4 py-3 mono-label">Status</th>
              <th className="text-left px-4 py-3 mono-label">Retainer</th>
              <th className="text-left px-4 py-3 mono-label">Billing Email</th>
              <th className="text-left px-4 py-3 mono-label">Created</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-surface-hover transition-colors">
                <td className="px-4 py-3 text-text-primary font-medium">{c.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${statusBadge[c.status]?.cls}`}>
                    {statusBadge[c.status]?.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-primary font-mono">${(c.monthly_retainer / 100).toLocaleString()}</td>
                <td className="px-4 py-3 text-text-secondary">{c.billing_email}</td>
                <td className="px-4 py-3 text-text-tertiary text-xs font-mono">
                  {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
