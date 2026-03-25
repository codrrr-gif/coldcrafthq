// src/app/api/cron/sync-close/route.ts
import { NextResponse } from 'next/server';
import { reverseSync } from '@/lib/crm/reverse-sync';
import { notifyCronFailure } from '@/lib/slack';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await reverseSync();
    console.log('[sync-close]', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[sync-close] Failed:', error);
    await notifyCronFailure('sync-close', error).catch(() => {});
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
