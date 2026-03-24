// ============================================
// Cron: Daily Engine — Auto-Send + Self-Improve
// ============================================
// Runs daily (Vercel hobby plan). Handles:
// 1. Auto-send stale pending replies
// 2. Score silent outcomes (3-day window)
// 3. Auto-tune confidence thresholds

import { NextRequest, NextResponse } from 'next/server';
import { processTimeoutAutoSends } from '@/lib/ai/auto-send';
import { evaluateSilentOutcomes, tuneThresholds } from '@/lib/ai/outcomes';
import { runDailySequence } from '@/lib/orchestrator/sequence-runner';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const [autoSendResult, silenceCount, thresholdResult, sequenceResult] = await Promise.all([
    processTimeoutAutoSends(),
    evaluateSilentOutcomes().catch(() => 0),
    tuneThresholds().catch(() => ({ adjusted: 0 })),
    runDailySequence().catch((err) => {
      console.error('[cron] Sequence runner failed:', err);
      return { linkedin_connects: 0, linkedin_dms: 0, voice_calls: 0, job_changes: 0, heat_scores_updated: 0 };
    }),
  ]);

  const ingestSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coldcrafthq.com';

  // Trigger learning optimization (fire-and-forget — non-blocking)
  fetch(`${appUrl}/api/learning/optimize`, {
    method: 'POST',
    headers: ingestSecret ? { Authorization: `Bearer ${ingestSecret}` } : {},
  }).catch(console.error);

  // Trigger pipeline ingest (fire-and-forget — non-blocking)
  // On Hobby plan: piggybacks on this daily cron.
  // On Pro: add a dedicated /api/pipeline/ingest cron instead.
  fetch(`${appUrl}/api/pipeline/ingest`, {
    method: 'POST',
    headers: ingestSecret ? { Authorization: `Bearer ${ingestSecret}` } : {},
  }).catch(console.error);

  return NextResponse.json({
    success: true,
    auto_send: autoSendResult,
    outcomes: {
      silence_scored: silenceCount,
      thresholds_adjusted: thresholdResult.adjusted,
    },
    sequence: sequenceResult,
    timestamp: new Date().toISOString(),
  });
}
