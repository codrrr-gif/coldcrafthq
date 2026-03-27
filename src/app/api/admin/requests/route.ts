import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data } = await supabase
    .from('client_requests')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })
    .limit(200);

  return NextResponse.json({ requests: data || [] });
}
