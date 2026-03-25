// src/app/api/tam/discover/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { discoverFromCrunchbase, discoverFromLinkedIn, upsertCompanies } from '@/lib/tam/company-discovery';
import { supabase } from '@/lib/supabase/client';
import { requireSecret } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authErr = requireSecret(req);
  if (authErr) return authErr;

  const { data, error } = await supabase
    .from('companies')
    .select('id,domain,name,industry,headcount_range,funding_stage,location,tier,tam_score,status,last_signal_at,source,created_at')
    .order('tam_score', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  // Auth is mandatory — reject if secret not configured
  const authErr = requireSecret(req);
  if (authErr) return authErr;

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
