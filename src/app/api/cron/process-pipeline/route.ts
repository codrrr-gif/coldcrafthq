// src/app/api/cron/process-pipeline/route.ts
// ============================================
// Cron: Process pending pipeline leads in batches.
// Runs every 5 minutes on weekdays.
// Picks up leads in priority order (composite_score desc)
// and processes up to BATCH_SIZE per invocation.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { processPipelineLead } from '@/lib/pipeline/processor';
import { cleanupStalePipelineLeads } from '@/lib/pipeline/lead-cleanup';
import { requireSecret } from '@/lib/auth/api-auth';
import { checkDailyLimits } from '@/lib/pipeline/circuit-breaker';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min max — matches cron interval

const BATCH_SIZE = 2; // Keep small — contact finder waterfall is slow

export async function GET(req: NextRequest) {
  const authErr = requireSecret(req);
  if (authErr) return authErr;

  try {
    // Check daily limits before processing
    const limits = await checkDailyLimits();
    if (!limits.allowed) {
      return NextResponse.json({ status: 'rate_limited', reason: limits.reason });
    }

    // Clean up leads stuck in intermediate states
    await cleanupStalePipelineLeads();

    // Fetch batch of pending leads, highest score first
    const { data: leads } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('status', 'pending')
      .order('composite_score', { ascending: false, nullsFirst: false })
      .limit(BATCH_SIZE);

    if (!leads?.length) {
      return NextResponse.json({ status: 'idle', processed: 0 });
    }

    let processed = 0;
    let failed = 0;

    for (const lead of leads) {
      try {
        await processPipelineLead(lead);
        processed++;
      } catch (err) {
        console.error(`[process-pipeline] Failed lead ${lead.id}:`, err);
        failed++;
      }
    }

    return NextResponse.json({
      status: 'ok',
      processed,
      failed,
      remaining: leads.length === BATCH_SIZE ? '5+' : 0,
    });
  } catch (err) {
    console.error('[process-pipeline] Cron error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
