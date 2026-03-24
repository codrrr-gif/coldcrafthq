// src/app/api/champions/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { detectJobChanges } from '@/lib/champions/job-change-detector';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;
  if (cronSecret) {
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  const changes = await detectJobChanges();
  return NextResponse.json({ changes_detected: changes });
}
