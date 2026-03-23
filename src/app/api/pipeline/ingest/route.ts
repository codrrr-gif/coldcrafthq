// src/app/api/pipeline/ingest/route.ts
// ============================================
// Called by daily cron (piggybacked on auto-send) or manually.
// Starts Apify actor runs for all enabled signal sources.
// Returns run IDs immediately — processing happens when /check is polled.
// ============================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { runGoogleSearch, runLinkedInJobsSearch } from '@/lib/apify';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { data: sources } = await supabase
      .from('signal_sources')
      .select('*')
      .eq('enabled', true);

    if (!sources?.length) {
      return NextResponse.json({ started: 0 });
    }

    const runs: { source: string; runId: string; datasetId: string }[] = [];

    for (const source of sources) {
      try {
        let run: { runId: string; datasetId: string };

        if (source.name === 'linkedin_jobs_sales') {
          run = await runLinkedInJobsSearch(source.search_queries as string[], 'United States', 100);
        } else {
          run = await runGoogleSearch(source.search_queries as string[], 5);
        }

        runs.push({ source: source.name, ...run });

        await supabase.from('signal_sources').update({
          last_run_at: new Date().toISOString(),
          last_run_id: run.runId,
        }).eq('id', source.id);
      } catch (err) {
        console.error(`Failed to start actor for ${source.name}:`, err);
      }
    }

    return NextResponse.json({ started: runs.length, runs });
  } catch (err) {
    console.error('Ingest error:', err);
    return NextResponse.json({ error: 'Ingest failed' }, { status: 500 });
  }
}
