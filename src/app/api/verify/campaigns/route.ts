// ============================================
// GET /api/verify/campaigns
// ============================================
// Returns Instantly campaigns for the push dropdown.

import { NextResponse } from 'next/server';
import { getCampaigns } from '@/lib/instantly';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const campaigns = await getCampaigns();
    const resp = NextResponse.json(campaigns);
    resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return resp;
  } catch (err) {
    console.error('Failed to fetch campaigns:', err);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}
