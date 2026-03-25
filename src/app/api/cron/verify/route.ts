// ============================================
// Cron: Bulk Verification Processor — every 6 hours
// ============================================
// Processes the pending email verification queue.
// On Pro: extended timeout allows larger batch per run.

import { NextRequest, NextResponse } from 'next/server';
import { processVerificationJobs } from '@/lib/verify/bulk-processor';
import { requireSecret } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Auth is mandatory — reject if secret not configured
  const authErr = requireSecret(req);
  if (authErr) return authErr;

  const result = await processVerificationJobs();

  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}
