// ============================================
// Portal Auth — Session helpers for API routes
// ============================================

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import type { PortalSession } from './types';

// Extracts and validates portal session from JWT.
// Returns null + error response if unauthorized.
export async function requirePortalSession(): Promise<
  { session: PortalSession; error: null } | { session: null; error: NextResponse }
> {
  const raw = await getServerSession(authOptions);

  if (!raw?.user) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const clientId = (raw as unknown as Record<string, unknown>).clientId as string | undefined;
  const role = (raw as unknown as Record<string, unknown>).role as string | undefined;
  const clientName = (raw as unknown as Record<string, unknown>).clientName as string | undefined;

  if (!clientId || !role) {
    return { session: null, error: NextResponse.json({ error: 'Not a portal session' }, { status: 403 }) };
  }

  return {
    session: {
      userId: raw.user.email || '',
      email: raw.user.email || '',
      clientId,
      clientName: clientName || '',
      role: role as 'owner' | 'member' | 'viewer',
    },
    error: null,
  };
}

// Check if the session has at least the required role level.
export function hasRole(session: PortalSession, minRole: 'viewer' | 'member' | 'owner'): boolean {
  const levels: Record<string, number> = { viewer: 0, member: 1, owner: 2 };
  return (levels[session.role] ?? -1) >= (levels[minRole] ?? 99);
}
