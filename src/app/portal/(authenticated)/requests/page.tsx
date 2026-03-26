'use client';

import { useState, useEffect } from 'react';
import type { ClientRequest, RequestType } from '@/lib/portal/types';

const requestTypes: { value: RequestType; label: string }[] = [
  { value: 'pause_campaign', label: 'Pause Campaign' },
  { value: 'resume_campaign', label: 'Resume Campaign' },
  { value: 'update_icp', label: 'Update ICP' },
  { value: 'change_offer', label: 'Change Offer' },
  { value: 'general_question', label: 'General Question' },
  { value: 'other', label: 'Other' },
];

const statusBadge: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  resolved: { label: 'Resolved', cls: 'bg-green-400/10 text-green-400 border-green-400/20' },
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<RequestType>('general_question');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  function loadRequests() {
    fetch('/api/portal/requests')
      .then((r) => r.json())
      .then((data) => { setRequests(data.requests); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadRequests(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    await fetch('/api/portal/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, subject, description }),
    });

    setShowForm(false);
    setSubject('');
    setDescription('');
    setSubmitting(false);
    loadRequests();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl text-text-primary">Requests</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium rounded-md transition-colors"
        >
          {showForm ? 'Cancel' : 'New Request'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-bg-surface border border-border-subtle rounded-lg p-6 mb-6 space-y-4">
          <div>
            <label className="block text-xs text-text-secondary font-mono mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RequestType)}
              className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary"
            >
              {requestTypes.map((rt) => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary font-mono mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary"
              placeholder="Brief summary of your request"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary font-mono mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-md text-sm text-text-primary resize-y"
              placeholder="Provide details about what you need..."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium rounded-md disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-text-secondary text-sm">Loading...</div>
      ) : requests.length === 0 ? (
        <p className="text-text-secondary text-sm">No requests yet.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="bg-bg-surface border border-border-subtle rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-text-primary">{req.subject}</h3>
                <span className={`text-xs px-2 py-0.5 rounded border ${statusBadge[req.status]?.cls}`}>
                  {statusBadge[req.status]?.label}
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-2">{req.description}</p>
              {req.admin_response && (
                <div className="mt-3 pt-3 border-t border-border-subtle">
                  <p className="text-xs text-text-tertiary font-mono mb-1">Response from ColdCraft:</p>
                  <p className="text-sm text-text-primary">{req.admin_response}</p>
                </div>
              )}
              <p className="text-xs text-text-tertiary mt-2">
                {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
