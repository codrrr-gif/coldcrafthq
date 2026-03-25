// src/app/api/crm/pipeline/route.ts
// Fetches live pipeline data from Close CRM.
// Returns leads grouped by opportunity status + recent activity.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_BASE = 'https://api.close.com/api/v1';

function closeHeaders() {
  const key = process.env.CLOSE_CRM_API_KEY;
  if (!key) throw new Error('CLOSE_CRM_API_KEY not set');
  const encoded = Buffer.from(`${key}:`).toString('base64');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${encoded}`,
  };
}

async function closeGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: closeHeaders(),
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Close API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function GET() {
  if (!process.env.CLOSE_CRM_API_KEY) {
    return NextResponse.json({ error: 'CLOSE_CRM_API_KEY not configured' }, { status: 503 });
  }

  try {
    // Fetch recent leads tagged ColdCraft (last 100)
    const [leadsData, oppStatusData] = await Promise.all([
      closeGet<{ data: CloseLead[] }>(
        '/lead/?query=tag:"ColdCraft"&_fields=id,name,contacts,status_label,date_created,date_updated,opportunities&limit=100'
      ),
      closeGet<{ data: OppStatus[] }>('/status/opportunity/'),
    ]);

    const leads = leadsData.data || [];
    const statuses: OppStatus[] = oppStatusData.data || [];

    // Build status map for labels
    const statusMap = Object.fromEntries(statuses.map((s) => [s.id, s]));

    // Fetch recent activities (notes) for context
    const activitiesData = await closeGet<{ data: Activity[] }>(
      '/activity/note/?_fields=id,lead_id,note,date_created&limit=50'
    ).catch(() => ({ data: [] as Activity[] }));

    const activityByLead: Record<string, string> = {};
    for (const a of activitiesData.data || []) {
      if (!activityByLead[a.lead_id]) {
        activityByLead[a.lead_id] = a.note;
      }
    }

    // Enrich leads
    const enriched = leads.map((lead) => {
      const primaryContact = lead.contacts?.[0];
      const latestOpp = lead.opportunities?.[lead.opportunities.length - 1];
      const oppStatus = latestOpp ? statusMap[latestOpp.status_id] : null;

      return {
        id: lead.id,
        name: lead.name,
        close_url: `https://app.close.com/leads/${lead.id}/`,
        contact_name: primaryContact?.name || null,
        contact_email: primaryContact?.emails?.[0]?.email || null,
        status_label: lead.status_label || 'Active',
        opportunity_status: oppStatus?.label || null,
        opportunity_type: oppStatus?.type || null,
        opportunity_value: latestOpp?.value || null,
        latest_note: activityByLead[lead.id] || null,
        date_created: lead.date_created,
        date_updated: lead.date_updated,
      };
    });

    // Group by opportunity stage
    const groups: Record<string, typeof enriched> = {
      active: [],
      won: [],
      lost: [],
      none: [],
    };

    for (const lead of enriched) {
      const type = lead.opportunity_type || 'none';
      if (type === 'active') groups.active.push(lead);
      else if (type === 'won') groups.won.push(lead);
      else if (type === 'lost') groups.lost.push(lead);
      else groups.none.push(lead);
    }

    // Summary counts
    const summary = {
      total: leads.length,
      active: groups.active.length,
      won: groups.won.length,
      lost: groups.lost.length,
      no_opportunity: groups.none.length,
    };

    return NextResponse.json({ summary, groups, all: enriched });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface CloseLead {
  id: string;
  name: string;
  status_label: string;
  date_created: string;
  date_updated: string;
  contacts?: Array<{
    name: string;
    emails?: Array<{ email: string }>;
  }>;
  opportunities?: Array<{
    id: string;
    status_id: string;
    value: number | null;
  }>;
}

interface OppStatus {
  id: string;
  label: string;
  type: 'active' | 'won' | 'lost';
}

interface Activity {
  id: string;
  lead_id: string;
  note: string;
  date_created: string;
}
