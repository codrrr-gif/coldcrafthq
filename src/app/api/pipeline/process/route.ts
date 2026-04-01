// src/app/api/pipeline/process/route.ts
// Client-driven: processes one pending lead per call.
// Dashboard polls this every 10s while leads are in queue.

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { processPipelineLead } from '@/lib/pipeline/processor';
import { cleanupStalePipelineLeads } from '@/lib/pipeline/lead-cleanup';
import { requireSecret, requireSession } from '@/lib/auth/api-auth';
import { checkDailyLimits } from '@/lib/pipeline/circuit-breaker';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  // Accept either session auth (dashboard) or bearer token (cron)
  const hasBearer = req.headers.get('authorization')?.startsWith('Bearer ');
  const authErr = hasBearer ? requireSecret(req) : await requireSession();
  if (authErr) return authErr;

  try {
    // Check daily limits before processing
    const limits = await checkDailyLimits();
    if (!limits.allowed) {
      console.warn(`[process] Circuit breaker tripped: ${limits.reason}`);
      return NextResponse.json({ status: 'rate_limited', reason: limits.reason }, { status: 429 });
    }

    // Clean up leads stuck in intermediate states before processing new ones
    const cleanup = await cleanupStalePipelineLeads();
    if (cleanup.reset > 0 || cleanup.failed > 0) {
      console.log(`[process] Lead cleanup: ${cleanup.reset} reset, ${cleanup.failed} permanently failed`);
    }

    const { data: lead } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('status', 'pending')
      .order('composite_score', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (!lead) {
      return NextResponse.json({ status: 'idle', message: 'No pending leads' });
    }

    await processPipelineLead(lead);
    return NextResponse.json({ status: 'processed', lead_id: lead.id });
  } catch (err) {
    console.error('Process route error:', err);
    return NextResponse.json({ error: 'Process failed' }, { status: 500 });
  }
}
