'use client';

import { useState, useEffect } from 'react';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  last_login_at: string | null;
  accepted_at: string | null;
}

export default function SettingsPage() {
  const [portalName, setPortalName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/settings')
      .then((r) => r.json())
      .then((data) => {
        setPortalName(data.client.portal_name || '');
        setPrimaryColor(data.client.primary_color || '');
        setTeam(data.team);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function saveBranding() {
    setSaving(true);
    await fetch('/api/portal/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portal_name: portalName, primary_color: primaryColor }),
    });
    setSaving(false);
  }

  if (loading) return <div className="text-text-secondary text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-xl text-text-primary mb-6">Settings</h1>

      <section className="mb-8">
        <h2 className="font-display text-lg text-text-primary mb-4">Branding</h2>
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-xs text-text-secondary font-mono mb-1.5">Portal Name</label>
            <input value={portalName} onChange={(e) => setPortalName(e.target.value)} placeholder="e.g. Acme Outbound" className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary font-mono mb-1.5">Accent Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={primaryColor || '#3B82F6'} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded border border-border-subtle cursor-pointer" />
              <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#3B82F6" className="w-32 px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary font-mono" />
            </div>
          </div>
          <button onClick={saveBranding} disabled={saving} className="px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm rounded-md disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Branding'}
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg text-text-primary mb-4">Team Members</h2>
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-3 mono-label">Name</th>
                <th className="text-left px-4 py-3 mono-label">Email</th>
                <th className="text-left px-4 py-3 mono-label">Role</th>
                <th className="text-left px-4 py-3 mono-label">Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-4 py-3 text-text-primary">{m.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{m.email}</td>
                  <td className="px-4 py-3 text-text-tertiary font-mono text-xs">{m.role}</td>
                  <td className="px-4 py-3 text-xs">{m.accepted_at ? <span className="text-green-400">Active</span> : <span className="text-amber-400">Invited</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
