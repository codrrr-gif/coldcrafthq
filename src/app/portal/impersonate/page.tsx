'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';

function ImpersonateContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMsg('No impersonation token provided.');
      setStatus('error');
      return;
    }

    signIn('portal-impersonate', { token, redirect: false }).then((result) => {
      if (result?.ok) {
        router.push('/portal/dashboard');
      } else {
        setErrorMsg('Invalid or expired impersonation link.');
        setStatus('error');
      }
    }).catch(() => {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    });
  }, [token, router]);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="font-display text-xl text-text-primary mb-2">Impersonation Failed</h1>
          <p className="text-sm text-text-secondary mb-6">{errorMsg}</p>
          <Link
            href="/dashboard/clients"
            className="block w-full py-2.5 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium rounded-md text-center transition-colors"
          >
            Back to clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <p className="text-text-secondary text-sm">Entering client portal...</p>
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary flex items-center justify-center"><p className="text-text-secondary text-sm">Loading...</p></div>}>
      <ImpersonateContent />
    </Suspense>
  );
}
