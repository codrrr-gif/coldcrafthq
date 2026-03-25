// src/lib/crm/revenue-attribution.ts
// ============================================
// Traces won/lost deals back to their signal source.
// Writes to revenue_attribution table for batch learning.
// ============================================

import { supabase } from '@/lib/supabase/client';

const CLOSE_API = 'https://api.close.com/api/v1';

function closeHeaders() {
  const key = process.env.CLOSE_CRM_API_KEY;
  if (!key) throw new Error('CLOSE_CRM_API_KEY not set');
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
  };
}

export async function checkRevenueOutcomes(): Promise<{
  checked: number;
  attributed: number;
  errors: number;
}> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const query = encodeURIComponent(`date_updated > "${yesterday}"`);

  const res = await fetch(
    `${CLOSE_API}/opportunity/?query=${query}&_fields=id,lead_id,status_label,status_type,value,note,date_created,date_updated,date_won,date_lost&_limit=100`,
    { headers: closeHeaders() }
  );

  if (!res.ok) {
    console.error(`[revenue] Close query failed: ${res.status}`);
    return { checked: 0, attributed: 0, errors: 1 };
  }

  const { data: opportunities } = (await res.json()) as {
    data: Array<{
      id: string;
      lead_id: string;
      status_label: string;
      status_type: string;
      value: number;
      note: string;
      date_created: string;
      date_updated: string;
      date_won?: string;
      date_lost?: string;
    }>;
  };

  const closedOpps = opportunities.filter(
    (o) => o.status_type === 'won' || o.status_type === 'lost'
  );

  let attributed = 0;
  let errors = 0;

  for (const opp of closedOpps) {
    try {
      const leadRes = await fetch(
        `${CLOSE_API}/lead/${opp.lead_id}/?_fields=id,contacts`,
        { headers: closeHeaders() }
      );
      if (!leadRes.ok) continue;

      const lead = (await leadRes.json()) as {
        id: string;
        contacts: Array<{ emails: Array<{ email: string }> }>;
      };
      const email = lead.contacts?.[0]?.emails?.[0]?.email;
      if (!email) continue;

      const { data: pl } = await supabase
        .from('pipeline_leads')
        .select('id, signal_id, signal_type, instantly_campaign_id')
        .eq('email', email)
        .single();

      const { count: touchCount } = await supabase
        .from('touchpoints')
        .select('id', { count: 'exact', head: true })
        .eq('lead_id', pl?.id || '00000000-0000-0000-0000-000000000000');

      const created = new Date(opp.date_created);
      const closed = new Date(opp.date_won || opp.date_lost || opp.date_updated);
      const daysToClose = Math.round((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

      const { error } = await supabase.from('revenue_attribution').upsert(
        {
          opportunity_id: opp.id,
          close_lead_id: opp.lead_id,
          pipeline_lead_id: pl?.id || null,
          signal_id: pl?.signal_id || null,
          signal_type: pl?.signal_type || null,
          campaign_id: pl?.instantly_campaign_id || null,
          deal_value: opp.value || 0,
          outcome: opp.status_type as 'won' | 'lost',
          loss_reason: opp.status_type === 'lost' ? (opp.note || opp.status_label) : null,
          touches_count: touchCount || 0,
          days_to_close: daysToClose,
        },
        { onConflict: 'opportunity_id' }
      );

      if (!error) attributed++;
    } catch (err) {
      console.error(`[revenue] Attribution failed for opp ${opp.id}:`, err);
      errors++;
    }
  }

  return { checked: closedOpps.length, attributed, errors };
}
