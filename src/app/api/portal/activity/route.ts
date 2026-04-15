import { NextRequest, NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal/auth';
import { supabase } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const { session, error } = await requirePortalSession();
  if (error) return error;

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0') || 0);

  let query = supabase
    .from('activity_feed')
    .select('*', { count: 'exact' })
    .eq('client_id', session.clientId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  const { data, count, error: dbError } = await query;

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data || [], total: count || 0 });
}
