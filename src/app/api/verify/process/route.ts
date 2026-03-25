// ============================================
// Verification Chunk Processor
// ============================================
// POST /api/verify/process
// Body: { job_id: string }
//
// Called by the dashboard during polling — processes the next
// chunk of emails for a job. No cron needed; the client drives
// processing by calling this every few seconds while active.

import { NextRequest, NextResponse } from 'next/server';
import { processVerificationJobs } from '@/lib/verify/bulk-processor';
import { requireSecret } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const authErr = requireSecret(req);
  if (authErr) return authErr;

  try {
    const result = await processVerificationJobs();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('Process error:', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
