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

  // CSV export — paginate to bypass Supabase's 1000-row default cap
  if (format === 'csv') {
    const PAGE_SIZE = 1000;
    const allResults: Record<string, unknown>[] = [];
    let from = 0;

    while (true) {
      let query = supabase
        .from('verification_results')
        .select('first_name, last_name, email, company_name, niche, verdict, risk_level, score, reason, recommendation, suggested_correction')
        .eq('job_id', jobId)
        .order('email', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (verdict) query = query.eq('verdict', verdict);

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data || data.length === 0) break;
      allResults.push(...data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    const csv = exportResultsToCsv(allResults as never[]);
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
