import { NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal/auth';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  const { session, error } = await requirePortalSession();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from('meetings')
    .select('*')
    .eq('client_id', session.clientId)
    .order('scheduled_at', { ascending: false })
    .limit(200);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ meetings: data || [] });
}
