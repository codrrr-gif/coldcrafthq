// src/app/api/pipeline/process/route.ts
// Client-driven: processes one pending lead per call.
// Dashboard polls this every 10s while leads are in queue.

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { processPipelineLead } from '@/lib/pipeline/processor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  try {
    const { data: lead } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('status', 'pending')
      .order('signal_score', { ascending: false })
      .limit(1)
      .single();

    if (!lead) {
      return NextResponse.json({ status: 'idle', message: 'No pending leads' });
    }

    await processPipelineLead(lead);
    return NextResponse.json({ status: 'processed', lead_id: lead.id });
  } catch (err) {
    console.error('Process route error:', err);
    return NextResponse.json({ error: 'Process failed' }, { status: 500 });
  }
}
