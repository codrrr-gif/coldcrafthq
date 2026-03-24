// src/app/api/voice/trigger/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { scheduleFollowUpCalls } from '@/lib/voice/call-scheduler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;
  if (cronSecret) {
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  const called = await scheduleFollowUpCalls();
  return NextResponse.json({ calls_initiated: called });
}
