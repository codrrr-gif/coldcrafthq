'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('portal-credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password');
      setLoading(false);
    } else {
      router.push('/portal/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl text-text-primary">Client Portal</h1>
          <p className="text-sm text-text-secondary mt-2">Sign in to view your campaigns</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs text-text-secondary font-mono mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 bg-bg-surface border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs text-text-secondary font-mono mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-bg-surface border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-400 font-mono">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
