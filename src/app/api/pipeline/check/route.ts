// src/app/api/pipeline/check/route.ts
// ============================================
// Polled by the dashboard every 15s while actors are running.
// Checks Apify run status, ingests completed datasets,
// creates pipeline_leads rows from qualifying signals.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { requireSecret } from '@/lib/auth/api-auth';
import { getRunStatus, getDatasetItems } from '@/lib/apify';
import type { ParsedSignal } from '@/lib/gtm/types';
import { parseFundingSignals } from '@/lib/signals/funding';
import { parseJobPostingSignals } from '@/lib/signals/job-postings';
import { parseLeadershipSignals } from '@/lib/signals/leadership';
import { parseProductHuntGoogleSignals } from '@/lib/signals/product-hunt-google';
import { parseTwitterSignals } from '@/lib/signals/twitter';
import { parseG2IntentSignals } from '@/lib/signals/g2-intent';
import { parseIndeedJobSignals } from '@/lib/signals/indeed-jobs';
import { parseExpansionSignals } from '@/lib/signals/expansion';
import { filterSignalByIcp } from '@/lib/signals/icp-filter';
import { isBlockedDomain, isStaffingCompany } from '@/lib/pipeline/domain-quality';
import { scoreSignal, MIN_SIGNAL_SCORE } from '@/lib/signals/scorer';
import { hasRecentSignal, hasActivePipelineLead } from '@/lib/signals/deduplicator';
import { resolveDomain } from '@/lib/signals/domain-resolver';
import { checkPipelineHealth } from '@/lib/pipeline/health-check';

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

      const items = await getDatasetItems(runStatus.defaultDatasetId, 500);

      let parsed: ParsedSignal[] = [];
      if (source.name === 'google_news_funding') parsed = parseFundingSignals(items);
      else if (source.name === 'linkedin_jobs_sales') parsed = parseJobPostingSignals(items);
      else if (source.name === 'google_news_leadership') parsed = parseLeadershipSignals(items);
      else if (source.name === 'product_hunt_launches') parsed = parseProductHuntGoogleSignals(items);
      else if (source.name === 'twitter_signals') parsed = parseTwitterSignals(items);
      else if (source.name === 'crunchbase_activity') parsed = parseFundingSignals(items);
      else if (source.name === 'tech_news') parsed = parseFundingSignals(items);
      else if (source.name === 'g2_reviews') parsed = parseG2IntentSignals(items);
      else if (source.name === 'indeed_jobs') parsed = parseIndeedJobSignals(items);
      else if (source.name === 'expansion_signals') parsed = parseExpansionSignals(items);

      let sourceIngested = 0;

      for (const sig of parsed) {
        // Attempt domain resolution for signals missing a domain (e.g. G2/Capterra)
        const signal = { ...sig };
        if (!signal.company_domain && signal.company_name) {
          const resolved = await resolveDomain(signal.company_name);
          if (resolved) {
            signal.company_domain = resolved;
            console.log(`[check] Resolved domain for ${signal.company_name}: ${resolved}`);
          }
        }

        // Skip signals with no domain — synthetic domains cause 30-40% of enrichment failures
        if (!signal.company_domain) {
          console.warn('[check] Skipping signal — no domain:', signal.company_name);
          continue;
        }

        const icpResult = filterSignalByIcp(signal);
        if (!icpResult.passes) continue;

        // Quality gate: reject job boards, URL shorteners, enterprise giants, invalid domains
        if (isBlockedDomain(signal.company_domain)) continue;

        // Filter staffing/recruiting firms — they post jobs on behalf of clients, not themselves
        if (isStaffingCompany(signal.company_name, signal.company_domain)) continue;

        if (signal.company_domain) {
          const recent = await hasRecentSignal(signal.company_domain, signal.signal_type);
          if (recent) continue;

          // Cross-signal dedup: skip if this company already has an active lead from ANY signal type
          const activeLead = await hasActivePipelineLead(signal.company_domain);
          if (activeLead) {
            console.log(`[check] Skipping ${signal.company_domain} — active pipeline lead exists`);
            continue;
          }
        }

        const score = await scoreSignal(signal.signal_type, signal.signal_date, signal.headline);
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

        const { error: leadError } = await supabase.from('pipeline_leads').insert({
          signal_id: rawSignal.id,
          company_name: signal.company_name,
          company_domain: signal.company_domain,
          signal_type: signal.signal_type,
          signal_summary: signal.headline,
          signal_date: signal.signal_date,
          signal_score: score,
          status: 'pending',
          client_id: '00000000-0000-0000-0000-000000000001',
        });

        if (leadError) {
          console.error(`[check] Failed to create pipeline_lead for ${signal.company_domain}:`, leadError);
          continue;
        }

        sourceIngested++;
        totalIngested++;
      }

      await supabase.from('signal_sources').update({
        last_run_id: null,
        last_signal_count: sourceIngested
      }).eq('id', source.id);
    }

    // Run health check after all processing
    await checkPipelineHealth(totalIngested).catch(console.error);

    return NextResponse.json({
      status: allDone ? 'complete' : 'running',
      ingested: totalIngested,
    });
  } catch (err) {
    console.error('Check error:', err);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authErr = requireSecret(req);
  if (authErr) return authErr;
  return handler();
}

export async function POST(req: NextRequest) {
  const authErr = requireSecret(req);
  if (authErr) return authErr;
  return handler();
}
