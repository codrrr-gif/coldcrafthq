// src/lib/crm/close-client.ts
// ============================================
// Close CRM API client
// Basic auth: API key as username, empty password
// ============================================

const API_BASE = 'https://api.close.com/api/v1';

function getHeaders(): HeadersInit {
  const key = process.env.CLOSE_CRM_API_KEY;
  if (!key) throw new Error('CLOSE_CRM_API_KEY not set');
  const encoded = Buffer.from(`${key}:`).toString('base64');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${encoded}`,
  };
}

async function closeRequest<T>(
  path: string,
  options: RequestInit = {},
  retries = 3
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers || {}) },
    signal: AbortSignal.timeout(15000),
  });

  if (res.status === 429 && retries > 0) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '5', 10);
    console.warn(`[close] Rate limited, retrying in ${retryAfter}s (${retries} retries left)`);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return closeRequest<T>(path, options, retries - 1);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Close API error ${res.status}: ${text.substring(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CloseContact {
  name: string;
  title?: string;
  emails: { email: string; type: 'office' | 'personal' }[];
}

export interface CloseLead {
  id: string;
  name: string;
  contacts: Array<{ id: string; name: string; emails: Array<{ email: string }> }>;
  status_label?: string;
  created_at?: string;
}

export interface CloseOpportunity {
  id: string;
  lead_id: string;
  status_label: string;
  value?: number;
  note?: string;
}

export interface CloseOpportunityStatus {
  id: string;
  label: string;
  type: 'active' | 'won' | 'lost';
}

// ── Lead operations ────────────────────────────────────────────────────────────

export async function findLeadByEmail(email: string): Promise<CloseLead | null> {
  try {
    const data = await closeRequest<{ data: CloseLead[] }>(
      `/lead/?query=email_address:"${encodeURIComponent(email)}"&_fields=id,name,contacts,status_label`
    );
    return data.data?.[0] || null;
  } catch {
    return null;
  }
}

// Custom field IDs (created by setup-close-crm.ts)
export const CLOSE_CUSTOM_FIELDS = {
  signal_type:        'custom.cf_efhwQ8vBNme4IX5DGmootyuAtZWQpwcfdfVIV5MEaGu',
  signal_summary:     'custom.cf_181aEYN0ZkibhesefMn8wWvNbeR7lqZhfa2bH7zKWlZ',
  instantly_campaign: 'custom.cf_0X2FXdjhWphzFRFwYqmFA63lMaaOVrwW3cydxZ4JKWD',
  coldcraft_source:   'custom.cf_NsldaULcTjwHM482J94SjSrvFL0YDHOx7uXIXiK0I3r',
  email_found_via:    'custom.cf_NsTlxhO1EECZ1UY58BaYTbYzyW4zG0pzvsdjZBcYr5l',
} as const;

export async function getLeadStatuses(): Promise<Array<{ id: string; label: string; type: string }>> {
  try {
    const data = await closeRequest<{ data: Array<{ id: string; label: string; type: string }> }>('/status/lead/');
    return data.data || [];
  } catch {
    return [];
  }
}

export async function createLead(
  companyName: string,
  contact: CloseContact,
  options?: {
    tags?: string[];
    status_label?: string;
    custom?: Record<string, string>;
  }
): Promise<CloseLead> {
  // Look up the status_id if a label was provided
  let statusId: string | undefined;
  if (options?.status_label) {
    const statuses = await getLeadStatuses();
    statusId = statuses.find(
      (s) => s.label.toLowerCase() === options.status_label!.toLowerCase()
    )?.id;
  }

  return closeRequest<CloseLead>('/lead/', {
    method: 'POST',
    body: JSON.stringify({
      name: companyName,
      contacts: [contact],
      ...(statusId ? { status_id: statusId } : {}),
      ...(options?.custom || {}),
    }),
  });
}

export async function updateLead(
  leadId: string,
  updates: Record<string, unknown>
): Promise<CloseLead> {
  return closeRequest<CloseLead>(`/lead/${leadId}/`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function addNoteToLead(leadId: string, note: string): Promise<void> {
  await closeRequest('/activity/note/', {
    method: 'POST',
    body: JSON.stringify({ lead_id: leadId, note }),
  });
}

// ── Activity logging ─────────────────────────────────────────────────────────

export async function logEmail(
  leadId: string,
  params: {
    direction: 'outgoing' | 'incoming';
    subject: string;
    body_text: string;
    status?: 'sent' | 'received';
  }
): Promise<void> {
  await closeRequest('/activity/email/', {
    method: 'POST',
    body: JSON.stringify({
      lead_id: leadId,
      direction: params.direction,
      subject: params.subject,
      body_text: params.body_text,
      status: params.status || (params.direction === 'outgoing' ? 'sent' : 'received'),
    }),
  });
}

export async function logCall(
  leadId: string,
  params: {
    direction: 'outgoing' | 'incoming';
    duration?: number;
    note?: string;
    status?: 'completed' | 'no-answer' | 'voicemail';
  }
): Promise<void> {
  await closeRequest('/activity/call/', {
    method: 'POST',
    body: JSON.stringify({
      lead_id: leadId,
      direction: params.direction,
      duration: params.duration || 0,
      note: params.note || '',
      status: params.status || 'completed',
    }),
  });
}

export async function createTask(
  leadId: string,
  params: {
    text: string;
    due_date?: string;
    assigned_to?: string;
  }
): Promise<void> {
  await closeRequest('/task/', {
    method: 'POST',
    body: JSON.stringify({
      lead_id: leadId,
      text: params.text,
      ...(params.due_date ? { date: params.due_date } : {}),
      ...(params.assigned_to ? { assigned_to: params.assigned_to } : {}),
    }),
  });
}

export async function getCurrentUser(): Promise<{ id: string; first_name: string; email: string }> {
  return closeRequest<{ id: string; first_name: string; email: string }>('/me/');
}

// ── Opportunity operations ─────────────────────────────────────────────────────

export async function getOpportunityStatuses(): Promise<CloseOpportunityStatus[]> {
  try {
    const data = await closeRequest<{ data: CloseOpportunityStatus[] }>(
      '/status/opportunity/'
    );
    return data.data || [];
  } catch {
    return [];
  }
}

export async function createOpportunity(
  leadId: string,
  statusId: string,
  note?: string,
  value?: number
): Promise<CloseOpportunity> {
  return closeRequest<CloseOpportunity>('/opportunity/', {
    method: 'POST',
    body: JSON.stringify({
      lead_id: leadId,
      status_id: statusId,
      ...(note ? { note } : {}),
      ...(value ? { value } : {}),
    }),
  });
}
