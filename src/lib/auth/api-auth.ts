// Shared auth utilities for API routes
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

// For dashboard-triggered API routes (requires session)
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null; // null = authorized
}

// For cron/webhook routes (requires bearer token)
export function requireSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error('[auth] No CRON_SECRET or WEBHOOK_SECRET configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null; // null = authorized
}

// For Vapi webhooks (uses x-vapi-secret header)
export function requireVapiSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[auth] No VAPI_WEBHOOK_SECRET configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }
  if (req.headers.get('x-vapi-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
