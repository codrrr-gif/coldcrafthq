// ============================================
// Instantly.ai API Client
// ============================================

import type { ThreadMessage } from './types';

const API_BASE = 'https://api.instantly.ai/api/v2';

// Distribute across INSTANTLY_API_KEY and INSTANTLY_API_KEY_2 to
// double throughput and reduce rate-limit risk across two workspaces.
// Uses hash-based selection instead of module-level counter (resets in serverless).
function getApiKey(seed?: string): string {
  const keys = [process.env.INSTANTLY_API_KEY, process.env.INSTANTLY_API_KEY_2].filter(Boolean) as string[];
  if (!keys.length) throw new Error('INSTANTLY_API_KEY not set');
  if (keys.length === 1) return keys[0];
  // Use seed hash for deterministic distribution, random fallback
  const idx = seed
    ? Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % keys.length
    : Math.floor(Math.random() * keys.length);
  return keys[idx];
}

function headers(seed?: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey(seed)}`,
  };
}

// Get full email thread for a lead
export async function getThread(campaignId: string, leadEmail: string): Promise<ThreadMessage[]> {
  const res = await fetch(
    `${API_BASE}/emails?campaign_id=${campaignId}&email=${encodeURIComponent(leadEmail)}&limit=50`,
    { headers: headers(leadEmail), signal: AbortSignal.timeout(15000) }
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
// v2 API requires: reply_to_uuid, eaccount, subject, body (as {html, text}).
// We fetch the thread first to resolve these from the last email.
export async function sendReply(
  campaignId: string,
  leadEmail: string,
  replyBody: string
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  // Step 1: Fetch the last email in the thread to get uuid, eaccount, subject
  const threadRes = await fetch(
    `${API_BASE}/emails?campaign_id=${campaignId}&email=${encodeURIComponent(leadEmail)}&limit=1`,
    { headers: headers(leadEmail), signal: AbortSignal.timeout(15000) }
  );

  if (!threadRes.ok) {
    const text = await threadRes.text();
    return { success: false, error: `Failed to fetch thread: ${threadRes.status}: ${text}` };
  }

  const threadData = await threadRes.json();
  const emails = threadData.data || threadData.items || threadData || [];
  const lastEmail = Array.isArray(emails) ? emails[0] : null;

  if (!lastEmail?.id) {
    return { success: false, error: 'Could not resolve reply_to_uuid — no emails found in thread' };
  }

  // Step 2: Send the reply with all required v2 fields
  const htmlBody = replyBody.replace(/\n/g, '<br>');
  const res = await fetch(`${API_BASE}/emails/reply`, {
    method: 'POST',
    headers: headers(leadEmail),
    body: JSON.stringify({
      reply_to_uuid: lastEmail.id,
      eaccount: lastEmail.eaccount,
      subject: lastEmail.subject || 'Re:',
      body: { html: htmlBody, text: replyBody },
    }),
    signal: AbortSignal.timeout(15000),
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
    headers: headers(leadEmail),
    body: JSON.stringify({
      email: leadEmail,
      label,
    }),
    signal: AbortSignal.timeout(15000),
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
    headers: headers(leadEmail),
    body: JSON.stringify({
      campaign_id: campaignId,
      email: leadEmail,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly deleteLead failed: ${res.status} ${text}`);
  }
}

// Add email to blocklist
// Note: Instantly v2 removed the /blocklist endpoint.
// We try both v2 and v1 patterns, and log a warning if neither works.
// The critical action is deleteLead — blocklist is a secondary safeguard.
export async function blockEmail(email: string): Promise<void> {
  const endpoints = [
    { url: `${API_BASE}/blocklist`, body: { email } },
    { url: `${API_BASE}/block-list-entries`, body: { entries: [email], entry_type: 'email' } },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: headers(email),
        body: JSON.stringify(ep.body),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return;
    } catch {
      // Try next endpoint
    }
  }

  // Neither endpoint worked — log but don't throw.
  // The lead is already deleted from the campaign which is the critical action.
  console.warn(`[instantly] blockEmail: no working blocklist endpoint for ${email}. Lead was deleted from campaign but not blocklisted.`);
}

// List all campaigns in the workspace
export async function getCampaigns(): Promise<{ id: string; name: string; status: string }[]> {
  const res = await fetch(`${API_BASE}/campaigns?limit=100`, {
    headers: headers(),
    signal: AbortSignal.timeout(15000),
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
// NOTE: v2 endpoint is /leads/add, custom fields go in custom_variables object.
const STANDARD_LEAD_FIELDS = new Set([
  'email', 'first_name', 'last_name', 'company_name',
  'phone', 'website', 'personalization',
]);

export async function addLeadsToCampaign(
  campaignId: string,
  leads: { email: string; first_name?: string; last_name?: string; company_name?: string; [key: string]: string | undefined }[]
): Promise<{ added: number; skipped: number; error?: string }> {
  const BATCH_SIZE = 1000;
  let totalAdded = 0;
  let totalSkipped = 0;

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);

    // Separate standard fields from custom variables for v2 API
    const formattedLeads = batch.map(lead => {
      const standard: Record<string, string | undefined> = {};
      const customVars: Record<string, string> = {};
      for (const [key, value] of Object.entries(lead)) {
        if (value === undefined) continue;
        if (STANDARD_LEAD_FIELDS.has(key)) {
          standard[key] = value;
        } else {
          customVars[key] = value;
        }
      }
      return {
        ...standard,
        ...(Object.keys(customVars).length ? { custom_variables: customVars } : {}),
      };
    });

    const res = await fetch(`${API_BASE}/leads/add`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        campaign_id: campaignId,
        leads: formattedLeads,
        skip_if_in_workspace: false,
        skip_if_in_campaign: true,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text();
      return { added: totalAdded, skipped: totalSkipped, error: `${res.status}: ${text}` };
    }

    const data = await res.json();
    totalAdded += data.leads_uploaded ?? batch.length;
    totalSkipped += data.skipped_count ?? 0;
  }

  return { added: totalAdded, skipped: totalSkipped };
}

// Get lead labels (used for initial setup)
export async function getLeadLabels(): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`${API_BASE}/leads/labels`, {
    headers: headers(),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly getLeadLabels failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.data || data || [];
}

export async function pauseCampaign(campaignId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/pause`, {
      method: 'POST',
      headers: headers(campaignId),
      signal: AbortSignal.timeout(15000),
    });
    return res.ok;
  } catch (err) {
    console.error(`[instantly] Failed to pause campaign ${campaignId}:`, err);
    return false;
  }
}

export async function listSendingAccounts(): Promise<Array<{ email: string; daily_limit?: number }>> {
  const key = getApiKey();
  // listSendingAccounts has no lead context — uses random key via getApiKey()
  const res = await fetch('https://api.instantly.ai/api/v2/accounts?limit=100', {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || data.data || data || []).map((a: Record<string, unknown>) => ({
    email: a.email as string,
    daily_limit: a.daily_limit as number | undefined,
  }));
}
