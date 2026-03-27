'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function InviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return <p className="text-red-400 text-sm">Invalid invitation link.</p>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetch('/api/portal/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Failed to accept invitation');
      setLoading(false);
      return;
    }

    router.push('/portal/login');
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl text-text-primary">Set Your Password</h1>
          <p className="text-sm text-text-secondary mt-2">Welcome to the client portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary font-mono mb-1.5">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full px-3 py-2 bg-bg-surface border border-border-subtle rounded-md text-sm text-text-primary" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary font-mono mb-1.5">Confirm Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="w-full px-3 py-2 bg-bg-surface border border-border-subtle rounded-md text-sm text-text-primary" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium rounded-md disabled:opacity-50">
            {loading ? 'Setting up...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary">Loading...</div></div>}>
      <InviteForm />
    </Suspense>
  );
}
