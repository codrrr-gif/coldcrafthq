'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Decode a JWT payload without verifying the signature.
 * This is used for client-side pre-validation only — the server
 * still performs full cryptographic verification on submit.
 */
function decodeJwtPayload(token: string): { userId?: string; clientId?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

function InvalidTokenView({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-text-primary">Invalid Invitation</h1>
          <p className="text-sm text-text-secondary mt-3 leading-relaxed">{message}</p>
        </div>
        <Link
          href="/portal/login"
          className="inline-block w-full py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium rounded-md transition-colors"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}

function InviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'validating' | 'valid' | 'invalid'>(
    token ? 'validating' : 'invalid'
  );
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid');
      setTokenError('This invitation link is missing or incomplete. Please check your email and try again.');
      return;
    }

    const payload = decodeJwtPayload(token);

    if (!payload) {
      setTokenStatus('invalid');
      setTokenError('This invitation link is malformed. Please check your email for the correct link.');
      return;
    }

    if (!payload.userId || !payload.clientId) {
      setTokenStatus('invalid');
      setTokenError('This invitation link is invalid. Please contact your account manager for a new invitation.');
      return;
    }

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      setTokenStatus('invalid');
      setTokenError('This invitation link has expired. Please contact your account manager for a new invitation.');
      return;
    }

    setTokenStatus('valid');
  }, [token]);

  if (tokenStatus === 'validating') {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-secondary text-sm">Validating invitation...</div>
      </div>
    );
  }

  if (tokenStatus === 'invalid') {
    return <InvalidTokenView message={tokenError} />;
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
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full px-3 py-2 bg-bg-surface border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary font-mono mb-1.5">Confirm Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="w-full px-3 py-2 bg-bg-surface border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors" />
          </div>
          {error && <p className="text-sm text-red-400 font-mono">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Setting up...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary text-sm">Loading...</div></div>}>
      <InviteForm />
    </Suspense>
  );
}
