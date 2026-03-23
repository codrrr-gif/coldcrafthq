// ============================================
// Instantly.ai API Client
// ============================================

import type { ThreadMessage } from './types';

const API_BASE = 'https://api.instantly.ai/api/v2';

function getApiKey(): string {
  const key = process.env.INSTANTLY_API_KEY;
  if (!key) throw new Error('INSTANTLY_API_KEY not set');
  return key;
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
  };
}

// Get full email thread for a lead
export async function getThread(campaignId: string, leadEmail: string): Promise<ThreadMessage[]> {
  const res = await fetch(
    `${API_BASE}/emails?campaign_id=${campaignId}&email=${encodeURIComponent(leadEmail)}&limit=50`,
    { headers: headers() }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly getThread failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const emails = data.data || data.items || data || [];

  return emails.map((email: Record<string, string>) => ({
    from: email.from_address || email.from || '',
    to: email.to_address || email.to || '',
    subject: email.subject || '',
    body: email.body?.replace(/<[^>]*>/g, '') || email.text_body || '',
    timestamp: email.timestamp || email.created_at || '',
  }));
}

// Send a reply through Instantly
export async function sendReply(
  campaignId: string,
  leadEmail: string,
  replyBody: string
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  const res = await fetch(`${API_BASE}/emails/reply`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      campaign_id: campaignId,
      reply_to_email: leadEmail,
      body: replyBody,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `${res.status}: ${text}` };
  }

  const data = await res.json();
  return { success: true, data };
}

// Tag a lead with a label
export async function tagLead(
  leadEmail: string,
  label: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/leads/label/assign`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      email: leadEmail,
      label,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly tagLead failed: ${res.status} ${text}`);
  }
}

// Delete a lead from campaign
export async function deleteLead(
  campaignId: string,
  leadEmail: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/leads`, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify({
      campaign_id: campaignId,
      email: leadEmail,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly deleteLead failed: ${res.status} ${text}`);
  }
}

// Add email to blocklist
export async function blockEmail(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/blocklist`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly blockEmail failed: ${res.status} ${text}`);
  }
}

// List all campaigns in the workspace
export async function getCampaigns(): Promise<{ id: string; name: string; status: string }[]> {
  const res = await fetch(`${API_BASE}/campaigns?limit=100`, {
    headers: headers(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly getCampaigns failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const campaigns = data.data || data.items || data || [];
  return campaigns.map((c: Record<string, string>) => ({
    id: c.id,
    name: c.name,
    status: c.status || 'unknown',
  }));
}

// Add leads to a campaign in bulk (max 1000 per call)
// Extra top-level fields are passed through as Instantly custom variables
// (e.g. personalized_opener, signal_summary, title) and referenced in
// campaign templates as {{personalized_opener}} etc.
export async function addLeadsToCampaign(
  campaignId: string,
  leads: { email: string; first_name?: string; last_name?: string; company_name?: string; [key: string]: string | undefined }[]
): Promise<{ added: number; skipped: number; error?: string }> {
  // Instantly recommends batches of 1000
  const BATCH_SIZE = 1000;
  let totalAdded = 0;
  let totalSkipped = 0;

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);

    const res = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        campaign_id: campaignId,
        leads: batch,
        skip_if_in_workspace: false,
        skip_if_in_campaign: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { added: totalAdded, skipped: totalSkipped, error: `${res.status}: ${text}` };
    }

    const data = await res.json();
    totalAdded += data.total_new_leads ?? batch.length;
    totalSkipped += data.total_duplicate_leads ?? 0;
  }

  return { added: totalAdded, skipped: totalSkipped };
}

// Get lead labels (used for initial setup)
export async function getLeadLabels(): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`${API_BASE}/leads/labels`, {
    headers: headers(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly getLeadLabels failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.data || data || [];
}
