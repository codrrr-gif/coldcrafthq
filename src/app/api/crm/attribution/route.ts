import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupBy = searchParams.get('group_by') || 'signal_type';
  const days = parseInt(searchParams.get('days') || '30', 10);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('revenue_attribution')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const grouped: Record<string, { won: number; lost: number; revenue: number; count: number; avg_days: number }> = {};
  for (const row of data || []) {
    const key = (row as Record<string, unknown>)[groupBy] as string || 'unknown';
    if (!grouped[key]) grouped[key] = { won: 0, lost: 0, revenue: 0, count: 0, avg_days: 0 };
    grouped[key].count++;
    if (row.outcome === 'won') {
      grouped[key].won++;
      grouped[key].revenue += row.deal_value || 0;
    } else {
      grouped[key].lost++;
    }
    grouped[key].avg_days += row.days_to_close || 0;
  }

  for (const key of Object.keys(grouped)) {
    if (grouped[key].count > 0) grouped[key].avg_days = Math.round(grouped[key].avg_days / grouped[key].count);
  }

  return NextResponse.json({ grouped, raw: data, period_days: days });
}
