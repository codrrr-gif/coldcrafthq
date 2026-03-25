// src/app/api/linkedin/connect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendLinkedInConnect } from '@/lib/linkedin/connection-sender';
import { supabase } from '@/lib/supabase/client';
import { requireSecret } from '@/lib/auth/api-auth';
import type { PipelineLead } from '@/lib/gtm/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authErr = requireSecret(req);
  if (authErr) return authErr;

  const { lead_id } = await req.json() as { lead_id: string };
  if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 });

  const { data: lead } = await supabase
    .from('pipeline_leads')
    .select('*')
    .eq('id', lead_id)
    .maybeSingle();

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const success = await sendLinkedInConnect(lead as PipelineLead);
  return NextResponse.json({ success });
}
