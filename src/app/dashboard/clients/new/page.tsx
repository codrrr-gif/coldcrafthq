'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [retainer, setRetainer] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        billing_email: email,
        monthly_retainer: Math.round(parseFloat(retainer) * 100),
        admin_email: adminEmail || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to create client');
      setCreating(false);
      return;
    }

    router.push('/dashboard/clients');
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-xl text-text-primary mb-6">Add New Client</h1>

      <form onSubmit={handleSubmit} className="bg-bg-surface border border-border-subtle rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-xs text-text-secondary font-mono mb-1.5">Company Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary" placeholder="Acme Corp" />
        </div>
        <div>
          <label className="block text-xs text-text-secondary font-mono mb-1.5">Billing Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary" placeholder="cfo@acme.com" />
        </div>
        <div>
          <label className="block text-xs text-text-secondary font-mono mb-1.5">Monthly Retainer ($)</label>
          <input type="number" value={retainer} onChange={(e) => setRetainer(e.target.value)} required min="0" step="0.01" className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary" placeholder="2000" />
        </div>
        <div>
          <label className="block text-xs text-text-secondary font-mono mb-1.5">Assigned Admin Email (optional)</label>
          <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary" placeholder="matt@coldcrafthq.com" />
        </div>

        {error && <p className="text-sm text-red-400 font-mono">{error}</p>}

        <button type="submit" disabled={creating} className="px-6 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium rounded-md disabled:opacity-50">
          {creating ? 'Creating...' : 'Create Client'}
        </button>
      </form>
    </div>
  );
}
