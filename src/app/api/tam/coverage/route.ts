// src/app/api/tam/coverage/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [total, t1, t2, t3, contacted, replied, meeting] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('tier', 1),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('tier', 2),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('tier', 3),
    supabase.from('companies').select('*', { count: 'exact', head: true }).neq('status', 'discovered'),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'replied'),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'meeting'),
  ]);

  return NextResponse.json({
    total: total.count || 0,
    tier1: t1.count || 0,
    tier2: t2.count || 0,
    tier3: t3.count || 0,
    contacted: contacted.count || 0,
    replied: replied.count || 0,
    meeting: meeting.count || 0,
    coverage_pct: total.count ? (((contacted.count || 0) / total.count) * 100).toFixed(1) : '0',
  });
}
