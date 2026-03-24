// src/app/api/learning/optimize/route.ts
// Runs the full self-learning optimization cycle.
// Called daily via fire-and-forget from the cron route.

import { NextRequest, NextResponse } from 'next/server';
import { optimizeSignalWeights } from '@/lib/learning/signal-optimizer';
import { optimizeIcpWeights } from '@/lib/learning/icp-learner';
import { analyzeOpeners } from '@/lib/learning/opener-analyzer';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;
  if (cronSecret) {
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Run sequentially to avoid upsert race conditions on learning_weights
  const signalWeightsUpdated = await optimizeSignalWeights().catch((err) => {
    console.error('[learning] Signal optimizer failed:', err);
    return 0;
  });

  const icpWeightsUpdated = await optimizeIcpWeights().catch((err) => {
    console.error('[learning] ICP learner failed:', err);
    return 0;
  });

  const openersExtracted = await analyzeOpeners().catch((err) => {
    console.error('[learning] Opener analyzer failed:', err);
    return 0;
  });

  return NextResponse.json({
    success: true,
    signal_weights_updated: signalWeightsUpdated,
    icp_weights_updated: icpWeightsUpdated,
    openers_extracted: openersExtracted,
    timestamp: new Date().toISOString(),
  });
}
