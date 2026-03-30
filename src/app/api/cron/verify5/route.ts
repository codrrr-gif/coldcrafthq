// Parallel verification worker 5 — same processor, separate cron slot
import { NextRequest, NextResponse } from 'next/server';
import { processVerificationJobs } from '@/lib/verify/bulk-processor';
import { requireSecret } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authErr = requireSecret(req);
  if (authErr) return authErr;
  const result = await processVerificationJobs();
  return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() });
}
