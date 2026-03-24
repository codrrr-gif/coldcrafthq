// ============================================
// Cron: Bulk Verification Processor
// ============================================
// Runs every minute to process pending verification jobs.
// Each invocation processes up to 10 emails to stay within
// Vercel's 60-second function timeout.

import { NextRequest, NextResponse } from 'next/server';
import { processVerificationJobs } from '@/lib/verify/bulk-processor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await processVerificationJobs();

  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}
