// src/app/api/heat/score/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { recalculateHeatScores } from '@/lib/heat/account-scorer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;
  if (cronSecret) {
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  const updated = await recalculateHeatScores();
  return NextResponse.json({ updated });
}
