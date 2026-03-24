// ============================================
// Verification Jobs List API
// ============================================
// GET /api/verify/jobs?limit=20

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20');

  const { data: jobs, error } = await supabase
    .from('verification_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const jobsWithProgress = (jobs || []).map((job) => ({
    ...job,
    progress: job.total_emails > 0
      ? Math.round((job.processed / job.total_emails) * 100)
      : 0,
  }));

  const resp = NextResponse.json(jobsWithProgress);
  resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return resp;
}
