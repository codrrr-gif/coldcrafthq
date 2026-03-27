'use client';

import { useState, useEffect } from 'react';

interface AdminRequest {
  id: string;
  client_id: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  clients: { name: string } | null;
}

const statusOpts = ['pending', 'in_progress', 'resolved'] as const;

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');

  function load() {
    fetch('/api/admin/requests')
      .then((r) => r.json())
      .then((data) => { setRequests(data.requests); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function updateRequest(id: string) {
    await fetch(`/api/admin/requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus || undefined, admin_response: response || undefined }),
    });
    setRespondingTo(null);
    setResponse('');
    setNewStatus('');
    load();
  }

  if (loading) return <div className="text-text-secondary text-sm">Loading requests...</div>;

  const pending = requests.filter((r) => r.status === 'pending').length;

  return (
    <div>
      <h1 className="font-display text-xl text-text-primary mb-2">Client Requests</h1>
      <p className="text-sm text-text-tertiary mb-6">{pending} pending</p>

      <div className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="bg-bg-surface border border-border-subtle rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs text-accent-primary font-mono">{req.clients?.name || 'Unknown'}</span>
                <h3 className="text-sm font-medium text-text-primary">{req.subject}</h3>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${req.status === 'pending' ? 'bg-amber-400/10 text-amber-400' : req.status === 'resolved' ? 'bg-green-400/10 text-green-400' : 'bg-blue-400/10 text-blue-400'}`}>
                {req.status}
              </span>
            </div>
            <p className="text-xs text-text-secondary mb-2">{req.description}</p>
            {req.admin_response && (
              <p className="text-xs text-text-tertiary border-t border-border-subtle pt-2 mt-2">Response: {req.admin_response}</p>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setRespondingTo(req.id); setNewStatus(req.status === 'pending' ? 'in_progress' : 'resolved'); }}
                className="text-xs text-accent-primary hover:underline"
              >
                Respond
              </button>
            </div>
            {respondingTo === req.id && (
              <div className="mt-3 pt-3 border-t border-border-subtle space-y-2">
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary">
                  {statusOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={3} placeholder="Your response..." className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary resize-y" />
                <button onClick={() => updateRequest(req.id)} className="px-4 py-1.5 bg-accent-primary text-white text-sm rounded-md">Update</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
