// ============================================
// Verification Job Status API
// ============================================
// GET /api/verify/status/[jobId]

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const { data: job, error } = await supabase
    .from('verification_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    );
  }

  const progress = job.total_emails > 0
    ? Math.round((job.processed / job.total_emails) * 100)
    : 0;

  const resp = NextResponse.json({
    ...job,
    progress,
  });
  resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return resp;
}
