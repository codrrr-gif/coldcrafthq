'use client';

import { useState, useEffect } from 'react';
import type { Invoice } from '@/lib/portal/types';

const statusBadge: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Paid', cls: 'bg-green-400/10 text-green-400' },
  open: { label: 'Upcoming', cls: 'bg-blue-400/10 text-blue-400' },
  overdue: { label: 'Overdue', cls: 'bg-red-400/10 text-red-400' },
  draft: { label: 'Draft', cls: 'bg-bg-surface-hover text-text-tertiary' },
  void: { label: 'Void', cls: 'bg-bg-surface-hover text-text-tertiary' },
};

export default function BillingPage() {
  const [data, setData] = useState<{
    monthly_retainer: number;
    subscription: { status: string; current_period_end: string } | null;
    portal_url: string | null;
    invoices: Invoice[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/billing')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-text-secondary text-sm">Loading billing...</div>;
  if (!data) return <p className="text-text-secondary">Failed to load billing data.</p>;

  return (
    <div>
      <h1 className="font-display text-xl text-text-primary mb-6">Billing</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <p className="mono-label mb-2">Monthly Plan</p>
          <p className="text-2xl font-display text-text-primary">${(data.monthly_retainer / 100).toLocaleString()}/mo</p>
        </div>
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <p className="mono-label mb-2">Next Invoice</p>
          <p className="text-lg text-text-primary">
            {data.subscription?.current_period_end
              ? new Date(data.subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : '-'}
          </p>
        </div>
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <p className="mono-label mb-2">Payment Method</p>
          {data.portal_url ? (
            <a href={data.portal_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-primary hover:underline">
              Manage payment method
            </a>
          ) : (
            <p className="text-sm text-text-tertiary">No payment method on file</p>
          )}
        </div>
      </div>

      <h2 className="font-display text-lg text-text-primary mb-4">Invoice History</h2>
      {data.invoices.length === 0 ? (
        <p className="text-text-secondary text-sm">No invoices yet.</p>
      ) : (
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-3 mono-label">Date</th>
                <th className="text-left px-4 py-3 mono-label">Amount</th>
                <th className="text-left px-4 py-3 mono-label">Status</th>
                <th className="text-left px-4 py-3 mono-label">PDF</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                    {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-text-primary">${(inv.amount / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusBadge[inv.status]?.cls}`}>
                      {statusBadge[inv.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.pdf_url ? (
                      <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-primary hover:underline">Download</a>
                    ) : '-'}
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
