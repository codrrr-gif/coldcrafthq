import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createExperiment, getExperimentResults } from '@/lib/instantly-experiments';

export async function GET() {
  const { data, error } = await supabase
    .from('ab_experiments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all(
    (data || []).map((exp) => getExperimentResults(exp.id))
  );

  return NextResponse.json({ experiments: enriched.filter(Boolean) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, base_campaign_id, variant_campaign_ids, signal_type } = body;

  if (!name || !base_campaign_id || !variant_campaign_ids?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const id = await createExperiment({
      name,
      baseCampaignId: base_campaign_id,
      variantCampaignIds: variant_campaign_ids,
      signalType: signal_type,
    });
    return NextResponse.json({ id, status: 'active' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { id, status, winner_campaign_id } = await request.json();

  const { error } = await supabase
    .from('ab_experiments')
    .update({
      status,
      winner_campaign_id,
      ended_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
