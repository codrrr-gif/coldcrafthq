// src/app/api/linkedin/message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendFollowUpDM } from '@/lib/linkedin/connection-sender';
import { supabase } from '@/lib/supabase/client';
import type { PipelineLead } from '@/lib/gtm/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { lead_id } = await req.json() as { lead_id: string };
  if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 });

  const { data: lead } = await supabase
    .from('pipeline_leads')
    .select('*')
    .eq('id', lead_id)
    .maybeSingle();

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const success = await sendFollowUpDM(lead as PipelineLead);
  return NextResponse.json({ success });
}
