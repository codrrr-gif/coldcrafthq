// ============================================
// Cron: Bulk Verification Processor — every 6 hours
// ============================================
// Processes the pending email verification queue.
// On Pro: extended timeout allows larger batch per run.

import { NextRequest, NextResponse } from 'next/server';
import { processVerificationJobs } from '@/lib/verify/bulk-processor';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
