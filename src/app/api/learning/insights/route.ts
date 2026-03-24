// src/app/api/learning/insights/route.ts
// Returns full funnel metrics for the insights dashboard.

import { NextResponse } from 'next/server';
import { getFunnelMetrics } from '@/lib/learning/performance-tracker';

export const dynamic = 'force-dynamic';

export async function GET() {
  const metrics = await getFunnelMetrics().catch((err) => {
    console.error('[insights] Failed to get metrics:', err);
    return null;
  });

  if (!metrics) return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 });
  return NextResponse.json(metrics);
}
