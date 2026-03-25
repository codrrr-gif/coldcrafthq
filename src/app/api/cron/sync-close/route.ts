// src/app/api/cron/sync-close/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { reverseSync } from '@/lib/crm/reverse-sync';
import { notifyCronFailure } from '@/lib/slack';
import { acquireCronLock, releaseCronLock } from '@/lib/cron-lock';
import { requireSecret } from '@/lib/auth/api-auth';

export async function GET(request: NextRequest) {
  // Auth is mandatory — reject if secret not configured
  const authErr = requireSecret(request);
  if (authErr) return authErr;

  const lockAcquired = await acquireCronLock('sync-close');
  if (!lockAcquired) {
    return NextResponse.json({ error: 'Another run is already in progress' }, { status: 409 });
  }

  try {
    const result = await reverseSync();
    console.log('[sync-close]', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[sync-close] Failed:', error);
    await notifyCronFailure('sync-close', error).catch(() => {});
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  } finally {
    await releaseCronLock('sync-close');
  }
}
