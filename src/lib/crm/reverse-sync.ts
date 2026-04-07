// src/lib/crm/reverse-sync.ts
// ============================================
// Detects Close CRM status changes on ColdCraft leads
// and syncs actions back to Instantly (reverse direction).
// ============================================

import { supabase } from '@/lib/supabase/client';
import { tagLead, deleteLead, blockEmail } from '../instantly';

const CLOSE_API = 'https://api.close.com/api/v1';

function closeHeaders() {
  const key = process.env.CLOSE_CRM_API_KEY;
  if (!key) throw new Error('CLOSE_CRM_API_KEY not set');
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
  };
}

// Status → action mapping
// tagLead/blockEmail are best-effort — failures must not crash the sync
const STATUS_ACTIONS: Record<string, (email: string, campaignId: string | null) => Promise<void>> = {
  'Meeting Booked': async (email) => {
    await tagLead(email, 'MEETING_BOOKED').catch((err) =>
      console.warn('[reverseSync] tagLead failed (non-blocking):', err));
  },
  'Won': async (email, campaignId) => {
    if (campaignId) await deleteLead(campaignId, email).catch(() => {});
    tagLead(email, 'WON').catch((err) =>
      console.warn('[reverseSync] tagLead failed (non-blocking):', err));
  },
  'Not Interested': async (email, campaignId) => {
    if (campaignId) await deleteLead(campaignId, email).catch(() => {});
    tagLead(email, 'CLOSED_LOST').catch((err) =>
      console.warn('[reverseSync] tagLead failed (non-blocking):', err));
  },
  'Bad Fit': async (email, campaignId) => {
    if (campaignId) await deleteLead(campaignId, email).catch(() => {});
    tagLead(email, 'BAD_FIT').catch((err) =>
      console.warn('[reverseSync] tagLead failed (non-blocking):', err));
    blockEmail(email).catch((err) =>
      console.warn('[reverseSync] blockEmail failed (non-blocking):', err));
  },
  'Nurture': async (email) => {
    const nurtureId = process.env.CAMPAIGN_ID_NURTURE;
    if (nurtureId) {
      const { addLeadsToCampaign } = await import('../instantly');
      await addLeadsToCampaign(nurtureId, [{ email }]);
    }
    tagLead(email, 'NURTURE').catch((err) =>
      console.warn('[reverseSync] tagLead failed (non-blocking):', err));
  },
  'Unsubscribed': async (email, campaignId) => {
    if (campaignId) await deleteLead(campaignId, email).catch(() => {});
    blockEmail(email).catch((err) =>
      console.warn('[reverseSync] blockEmail failed (non-blocking):', err));
  },
};

export async function reverseSync(): Promise<{ checked: number; changed: number; errors: number }> {
  // Get watermark — last sync time
  const { data: lastSync } = await supabase
    .from('close_sync_log')
    .select('synced_at')
    .order('synced_at', { ascending: false })
    .limit(1)
    .single();

  const watermark = lastSync?.synced_at
    ? new Date(lastSync.synced_at).toISOString()
    : new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago fallback

  // Query Close for recently updated ColdCraft leads
  const query = encodeURIComponent(`tag:"ColdCraft" date_updated > "${watermark}"`);
  const res = await fetch(
    `${CLOSE_API}/lead/?query=${query}&_fields=id,contacts,status_label,date_updated&_limit=100`,
    { headers: closeHeaders() }
  );

  if (!res.ok) {
    console.error(`[reverseSync] Close query failed: ${res.status}`);
    return { checked: 0, changed: 0, errors: 1 };
  }

  const { data: leads } = (await res.json()) as {
    data: Array<{
      id: string;
      contacts: Array<{ emails: Array<{ email: string }> }>;
      status_label: string;
      date_updated: string;
    }>;
  };

  let changed = 0;
  let errors = 0;

  for (const lead of leads) {
    const email = lead.contacts?.[0]?.emails?.[0]?.email;
    if (!email) continue;

    // Check if status changed
    const { data: existing } = await supabase
      .from('close_sync_log')
      .select('last_status, campaign_id')
      .eq('close_lead_id', lead.id)
      .single();

    if (existing?.last_status === lead.status_label) continue; // No change

    // Look up campaign_id from pipeline_leads
    let campaignId = existing?.campaign_id || null;
    if (!campaignId) {
      const { data: pl } = await supabase
        .from('pipeline_leads')
        .select('instantly_campaign_id')
        .eq('email', email)
        .single();
      campaignId = pl?.instantly_campaign_id || null;
    }

    // Execute action
    const action = STATUS_ACTIONS[lead.status_label];
    if (action) {
      try {
        await action(email, campaignId);
        changed++;
      } catch (err) {
        console.error(`[reverseSync] Failed for ${email}:`, err);
        errors++;
      }
    }

    // Upsert sync log
    await supabase.from('close_sync_log').upsert(
      {
        close_lead_id: lead.id,
        lead_email: email,
        campaign_id: campaignId,
        last_status: lead.status_label,
        last_close_updated_at: lead.date_updated,
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'close_lead_id' }
    );
  }

  return { checked: leads.length, changed, errors };
}
