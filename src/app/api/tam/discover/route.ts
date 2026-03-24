// src/app/api/tam/discover/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { discoverFromCrunchbase, discoverFromLinkedIn, upsertCompanies } from '@/lib/tam/company-discovery';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;
  if (cronSecret) {
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const keywords = (
    process.env.ICP_DISCOVERY_KEYWORDS ||
    'B2B SaaS sales software,revenue operations software,CRM software startup'
  ).split(',').map((k) => k.trim());

  const [crunchbaseResult, linkedinResult] = await Promise.allSettled([
    discoverFromCrunchbase(keywords, 200),
    discoverFromLinkedIn(keywords, 100),
  ]);

  const all = [
    ...(crunchbaseResult.status === 'fulfilled' ? crunchbaseResult.value : []),
    ...(linkedinResult.status === 'fulfilled' ? linkedinResult.value : []),
  ];

  const upserted = await upsertCompanies(all);
  return NextResponse.json({ discovered: all.length, upserted });
}
