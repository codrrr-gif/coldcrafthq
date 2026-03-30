// ============================================
// Verification Results API
// ============================================
// GET /api/verify/results/[jobId]?verdict=valid&page=1&limit=50
// GET /api/verify/results/[jobId]?format=csv — download results as CSV

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { exportResultsToCsv } from '@/lib/verify/export';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const { searchParams } = new URL(req.url);
  const verdict = searchParams.get('verdict');
  const format = searchParams.get('format');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  // Verify job exists
  const { data: job, error: jobError } = await supabase
    .from('verification_jobs')
    .select('id, status')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // CSV export
  if (format === 'csv') {
    let query = supabase
      .from('verification_results')
      .select('first_name, last_name, email, company_name, niche, verdict, risk_level, score, reason, recommendation, suggested_correction')
      .eq('job_id', jobId)
      .order('verdict', { ascending: true })
      .limit(50000);

    if (verdict) query = query.eq('verdict', verdict);

    const { data: results, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const csv = exportResultsToCsv(results || []);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="verification-${jobId}-${verdict || 'all'}.csv"`,
      },
    });
  }

  // JSON results
  let query = supabase
    .from('verification_results')
    .select('*')
    .eq('job_id', jobId)
    .order('score', { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (verdict) query = query.eq('verdict', verdict);

  const { data: results, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resp = NextResponse.json({
    results: results || [],
    page,
    limit,
    job_status: job.status,
  });
  resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return resp;
}
