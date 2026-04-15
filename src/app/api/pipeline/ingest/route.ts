// src/app/api/pipeline/ingest/route.ts
// ============================================
// Cron: Signal ingestion — 8am ET, weekdays
// Starts Apify actor runs for all enabled signal sources.
// Returns run IDs immediately — /check polls for completion.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { runGoogleSearch, runLinkedInJobsSearch, runTwitterSearch } from '@/lib/apify';
import { requireSecret } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

async function handler(req: NextRequest) {
  // Auth is mandatory — reject if secret not configured
  const authErr = requireSecret(req);
  if (authErr) return authErr;

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
          run = await runLinkedInJobsSearch(source.search_queries as string[], 'United States', 300);
        } else if (source.name === 'twitter_signals') {
          run = await runTwitterSearch(source.search_queries as string[], 150);
        } else {
          // All other sources use Google Search — funding, leadership, crunchbase,
          // product hunt, G2, Indeed, tech news, expansion signals
          run = await runGoogleSearch(source.search_queries as string[], 10);
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

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}
