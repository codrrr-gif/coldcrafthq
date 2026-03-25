// src/app/api/pipeline/check/route.ts
// ============================================
// Polled by the dashboard every 15s while actors are running.
// Checks Apify run status, ingests completed datasets,
// creates pipeline_leads rows from qualifying signals.
// ============================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getRunStatus, getDatasetItems } from '@/lib/apify';
import type { ParsedSignal } from '@/lib/gtm/types';
import { parseFundingSignals } from '@/lib/signals/funding';
import { parseJobPostingSignals } from '@/lib/signals/job-postings';
import { parseLeadershipSignals } from '@/lib/signals/leadership';
import { filterSignalByIcp } from '@/lib/signals/icp-filter';
import { scoreSignal, MIN_SIGNAL_SCORE } from '@/lib/signals/scorer';
import { hasRecentSignal } from '@/lib/signals/deduplicator';

export const dynamic = 'force-dynamic';

async function handler() {
  try {
    const { data: sources } = await supabase
      .from('signal_sources')
      .select('*')
      .eq('enabled', true)
      .not('last_run_id', 'is', null);

    if (!sources?.length) return NextResponse.json({ status: 'idle', processed: 0 });

    let totalIngested = 0;
    let allDone = true;

    for (const source of sources) {
      if (!source.last_run_id) continue;

      const runStatus = await getRunStatus(source.last_run_id as string);

      if (runStatus.status === 'RUNNING') {
        allDone = false;
        continue;
      }

      if (runStatus.status !== 'SUCCEEDED') {
        // Clear failed/aborted run IDs
        await supabase.from('signal_sources').update({ last_run_id: null }).eq('id', source.id);
        continue;
      }

      const items = await getDatasetItems(runStatus.defaultDatasetId, 200);

      let parsed: ParsedSignal[] = [];
      if (source.name === 'google_news_funding') parsed = parseFundingSignals(items);
      else if (source.name === 'linkedin_jobs_sales') parsed = parseJobPostingSignals(items);
      else if (source.name === 'google_news_leadership') parsed = parseLeadershipSignals(items);

      for (let signal of parsed) {
        // Domain fallback: derive synthetic domain from company name if missing
        // Lets the signal through ICP; pipeline will validate at enrichment stage
        if (!signal.company_domain && signal.company_name) {
          const syntheticDomain = signal.company_name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '')
            .slice(0, 30) + '.com';
          signal = { ...signal, company_domain: syntheticDomain };
        }

        const icpResult = filterSignalByIcp(signal);
        if (!icpResult.passes) continue;

        if (signal.company_domain) {
          const recent = await hasRecentSignal(signal.company_domain, signal.signal_type);
          if (recent) continue;
        }

        const score = scoreSignal(signal.signal_type, signal.signal_date, signal.headline);
        if (score < MIN_SIGNAL_SCORE) continue;

        const { data: rawSignal, error } = await supabase
          .from('raw_signals')
          .insert({
            source_name: source.name,
            signal_type: signal.signal_type,
            company_name: signal.company_name,
            company_domain: signal.company_domain,
            headline: signal.headline,
            signal_url: signal.signal_url,
            signal_date: signal.signal_date,
            score,
            raw_data: signal.raw_data,
          })
          .select('id')
          .single();

        if (error || !rawSignal) continue;

        await supabase.from('pipeline_leads').insert({
          signal_id: rawSignal.id,
          company_name: signal.company_name,
          company_domain: signal.company_domain || signal.company_name.toLowerCase().replace(/\s+/g, '') + '.com',
          signal_type: signal.signal_type,
          signal_summary: signal.headline,
          signal_date: signal.signal_date,
          signal_score: score,
          status: 'pending',
        });

        totalIngested++;
      }

      await supabase.from('signal_sources').update({ last_run_id: null }).eq('id', source.id);
    }

    return NextResponse.json({
      status: allDone ? 'complete' : 'running',
      ingested: totalIngested,
    });
  } catch (err) {
    console.error('Check error:', err);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}

export async function GET() {
  return handler();
}

export async function POST() {
  return handler();
}
