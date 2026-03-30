// ============================================
// Verification Chunk Processor
// ============================================
// POST /api/verify/process
// Accepts session cookies (dashboard) or Bearer token (cron)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processVerificationJobs } from '@/lib/verify/bulk-processor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Check Bearer token first (cron/API calls)
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const secret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    // Check session (dashboard calls)
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await processVerificationJobs();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('Process error:', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
