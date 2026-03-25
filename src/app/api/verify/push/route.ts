// ============================================
// POST /api/verify/push
// ============================================
// Pushes verified emails from a job to an Instantly campaign.
// Body: { job_id, campaign_id, include_risky? }
//
// Pushes: valid emails always
//         risky/send_with_caution if include_risky=true
// Never pushes: invalid, do_not_send

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { addLeadsToCampaign } from '@/lib/instantly';
import { requireSecret } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authErr = requireSecret(req);
  if (authErr) return authErr;

  try {
    const { job_id, campaign_id, include_risky = false } = await req.json();

    if (!job_id || !campaign_id) {
      return NextResponse.json(
        { error: 'job_id and campaign_id are required' },
        { status: 400 }
      );
    }

    // Verify job exists and is completed
    const { data: job, error: jobError } = await supabase
      .from('verification_jobs')
      .select('id, status, total_emails')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Job must be completed before pushing' },
        { status: 400 }
      );
    }

    // Fetch emails to push
    // Always include: valid
    // Optionally include: risky with send_with_caution recommendation
    const verdicts = ['valid'];
    if (include_risky) verdicts.push('risky');

    const query = supabase
      .from('verification_results')
      .select('email, recommendation')
      .eq('job_id', job_id)
      .in('verdict', verdicts)
      .limit(50000);

    const { data: results, error: resultsError } = await query;

    if (resultsError) {
      return NextResponse.json({ error: resultsError.message }, { status: 500 });
    }

    if (!results?.length) {
      return NextResponse.json({ error: 'No eligible emails to push' }, { status: 400 });
    }

    // Filter out do_not_send recommendations from risky batch
    const eligible = results.filter(
      (r) => r.recommendation !== 'do_not_send'
    );

    if (!eligible.length) {
      return NextResponse.json({ error: 'No eligible emails after filtering' }, { status: 400 });
    }

    // Build leads payload — email only (no extra data from verification)
    const leads = eligible.map((r) => ({ email: r.email }));

    // Push to Instantly
    const result = await addLeadsToCampaign(campaign_id, leads);

    if (result.error) {
      return NextResponse.json(
        { error: `Instantly API error: ${result.error}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      pushed: eligible.length,
      added: result.added,
      skipped: result.skipped,
      campaign_id,
      job_id,
    });
  } catch (err) {
    console.error('Push error:', err);
    return NextResponse.json({ error: 'Push failed' }, { status: 500 });
  }
}
