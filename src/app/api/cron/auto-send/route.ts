// ============================================
// Cron: Daily Engine — 10am ET, weekdays
// ============================================
// 1. Auto-send stale pending replies
// 2. Score silent outcomes (3-day window)
// 3. Auto-tune confidence thresholds
// 4. Run multi-channel sequences (LinkedIn, voice)
// 5. Trigger self-learning optimization (fire-and-forget)
//
// Pipeline ingest runs on its own dedicated cron (8am ET).

import { NextRequest, NextResponse } from 'next/server';
import { processTimeoutAutoSends } from '@/lib/ai/auto-send';
import { evaluateSilentOutcomes, tuneThresholds } from '@/lib/ai/outcomes';
import { runDailySequence } from '@/lib/orchestrator/sequence-runner';
import { acquireCronLock, releaseCronLock } from '@/lib/cron-lock';
import { requireSecret } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Auth is mandatory — reject if secret not configured
  const authErr = requireSecret(req);
  if (authErr) return authErr;

  const lockAcquired = await acquireCronLock('daily-sequence');
  if (!lockAcquired) {
    return NextResponse.json({ error: 'Another run is already in progress' }, { status: 409 });
  }

  try {
    const [autoSendResult, silenceCount, thresholdResult, sequenceResult] = await Promise.all([
      processTimeoutAutoSends(),
      evaluateSilentOutcomes().catch(() => 0),
      tuneThresholds().catch(() => ({ adjusted: 0 })),
      runDailySequence().catch((err) => {
        console.error('[cron] Sequence runner failed:', err);
        return { linkedin_connects: 0, linkedin_dms: 0, voice_calls: 0, job_changes: 0, heat_scores_updated: 0 };
      }),
    ]);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coldcrafthq.com';

    // Trigger learning optimization (fire-and-forget — non-blocking)
    const secret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;
    fetch(`${appUrl}/api/learning/optimize`, {
      method: 'POST',
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
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
  } finally {
    await releaseCronLock('daily-sequence');
  }
}
