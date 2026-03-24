// src/app/api/heat/score/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { recalculateHeatScores } from '@/lib/heat/account-scorer';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET() {
  const { data, error } = await supabase
    .from('account_heat_scores')
    .select('id,company_id,score,tier,signals_7d,signals_30d,last_signal_type,last_signal_at,last_calculated_at,companies(name,domain,industry,status)')
    .order('score', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;
  if (cronSecret) {
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  const updated = await recalculateHeatScores();
  return NextResponse.json({ updated });
}
