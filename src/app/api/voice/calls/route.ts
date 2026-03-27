// src/app/api/voice/calls/route.ts
// Returns voice calls with lead details for the dashboard.

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { requireSession } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = await requireSession();
  if (authErr) return authErr;

  const url = new URL(req.url);
  const outcome = url.searchParams.get('outcome');
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('voice_calls')
    .select(`
      *,
      pipeline_leads (
        first_name,
        last_name,
        email,
        company_name,
        signal_type
      )
    `)
    .order('called_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (outcome) query = query.eq('outcome', outcome);
  if (status) query = query.eq('status', status);

  const { data: calls, error } = await query;

  if (error) {
    console.error('[voice/calls] Query failed:', error);
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
  }

  // Stats query
  const [total, completed, interested, callbacks, noAnswer] = await Promise.all([
    supabase.from('voice_calls').select('*', { count: 'exact', head: true }),
    supabase.from('voice_calls').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('voice_calls').select('*', { count: 'exact', head: true }).eq('outcome', 'interested'),
    supabase.from('voice_calls').select('*', { count: 'exact', head: true }).eq('outcome', 'callback_requested'),
    supabase.from('voice_calls').select('*', { count: 'exact', head: true }).eq('outcome', 'no_answer'),
  ]);

  const res = NextResponse.json({
    calls: calls || [],
    stats: {
      total: total.count || 0,
      completed: completed.count || 0,
      interested: interested.count || 0,
      callbacks: callbacks.count || 0,
      no_answer: noAnswer.count || 0,
      connect_rate: (total.count || 0) > 0
        ? (((completed.count || 0) / (total.count || 1)) * 100).toFixed(1)
        : '0',
      interest_rate: (completed.count || 0) > 0
        ? (((interested.count || 0) / (completed.count || 1)) * 100).toFixed(1)
        : '0',
    },
  });

  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res;
}
