import { NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal/auth';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  const { session, error } = await requirePortalSession();
  if (error) return error;

  const { data } = await supabase
    .from('reports')
    .select('*')
    .eq('client_id', session.clientId)
    .order('period_end', { ascending: false })
    .limit(50);

  return NextResponse.json({ reports: data || [] });
}
