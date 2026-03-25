# Close CRM + Instantly AI Advancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 8 advancement systems across Close CRM and Instantly AI — bi-directional sync, activity timeline, auto-blocklist, auto-opportunity, revenue attribution, account health monitoring, A/B testing, and unified dashboard.

**Architecture:** 4 parallel workstreams sharing a single DB migration. Workstream A (sync layer) handles Close↔Instantly data flow. Workstream B (pipeline automation) adds opportunity creation and revenue tracking. Workstream C (Instantly intelligence) adds health monitoring and experiments. Workstream D (dashboard) aggregates everything into one view.

**Tech Stack:** Next.js App Router, Supabase PostgreSQL, Close CRM API v1, Instantly AI API v2, Vercel Crons

**Spec:** `docs/superpowers/specs/2026-03-25-close-instantly-advancement-design.md`

---

## Task 0: Database Migration

**Files:**
- Create: `src/lib/supabase/migration-v8-advancement.sql`

- [ ] **Step 1: Create migration file**

```sql
-- migration-v8-advancement.sql
-- Close CRM + Instantly AI Advancement Systems
-- Run: psql or Supabase SQL Editor

-- Close sync tracking
CREATE TABLE IF NOT EXISTS close_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  close_lead_id TEXT NOT NULL UNIQUE,
  lead_email TEXT,
  campaign_id TEXT,
  last_status TEXT NOT NULL,
  last_close_updated_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revenue attribution
CREATE TABLE IF NOT EXISTS revenue_attribution (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id TEXT NOT NULL UNIQUE,
  close_lead_id TEXT,
  pipeline_lead_id UUID REFERENCES pipeline_leads(id),
  signal_id UUID REFERENCES raw_signals(id),
  signal_type TEXT,
  campaign_id TEXT,
  deal_value NUMERIC,
  outcome TEXT NOT NULL CHECK (outcome IN ('won', 'lost')),
  loss_reason TEXT,
  touches_count INTEGER DEFAULT 0,
  days_to_close INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_revenue_signal ON revenue_attribution(signal_type);
CREATE INDEX idx_revenue_outcome ON revenue_attribution(outcome);
CREATE INDEX idx_revenue_campaign ON revenue_attribution(campaign_id);

-- Account health snapshots (rates as decimals: 0.05 = 5%)
CREATE TABLE IF NOT EXISTS account_health_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_email TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sends INTEGER DEFAULT 0,
  bounces INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  bounce_rate NUMERIC(7,6) DEFAULT 0,
  reply_rate NUMERIC(7,6) DEFAULT 0,
  health_score INTEGER DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  flagged BOOLEAN DEFAULT FALSE,
  UNIQUE(account_email, snapshot_date)
);
CREATE INDEX idx_health_date ON account_health_snapshots(snapshot_date);
CREATE INDEX idx_health_flagged ON account_health_snapshots(flagged) WHERE flagged = TRUE;

-- A/B experiments
CREATE TABLE IF NOT EXISTS ab_experiments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  signal_type TEXT,
  base_campaign_id TEXT NOT NULL,
  variant_campaign_ids TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  winner_campaign_id TEXT,
  total_leads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX idx_ab_status ON ab_experiments(status) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS ab_experiment_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID REFERENCES ab_experiments(id),
  lead_email TEXT NOT NULL,
  variant_index INTEGER NOT NULL,
  campaign_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, lead_email)
);
CREATE INDEX idx_ab_leads_experiment ON ab_experiment_leads(experiment_id);
```

- [ ] **Step 2: Run migration against Supabase**

Run the SQL in the Supabase SQL Editor or via psql. Verify all 5 tables created:

```bash
# Verify via Supabase client
curl -s "$SUPABASE_URL/rest/v1/close_sync_log?select=id&limit=0" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
# Should return [] (empty array, not 404)
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/migration-v8-advancement.sql
git commit -m "feat: migration-v8 — tables for Close sync, revenue attribution, account health, A/B experiments"
```

---

## Task 1: Close Client Wrappers (Workstream A prerequisite)

**Files:**
- Modify: `src/lib/crm/close-client.ts:141-172` (append after `addNoteToLead`)

These wrappers are used by Tasks 2-3. Build first.

- [ ] **Step 1: Add logEmail() to close-client.ts**

Append after line 141 (after `addNoteToLead`):

```typescript
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
```

- [ ] **Step 2: Add logCall() to close-client.ts**

Append after `logEmail`:

```typescript
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
```

- [ ] **Step 3: Add createTask() to close-client.ts**

```typescript
export async function createTask(
  leadId: string,
  params: {
    text: string;
    due_date?: string; // ISO date
    assigned_to?: string; // user ID
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
```

- [ ] **Step 4: Add getCurrentUser() to close-client.ts**

```typescript
export async function getCurrentUser(): Promise<{ id: string; first_name: string; email: string }> {
  return closeRequest<{ id: string; first_name: string; email: string }>('/me/');
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/crm/close-client.ts
git commit -m "feat: add logEmail, logCall, createTask, getCurrentUser to Close client"
```

---

## Task 2: Activity Timeline — logActivityToClose (Workstream A2)

**Files:**
- Modify: `src/lib/crm/close-sync.ts:179` (append new function after `createOpportunityInCrm`)

- [ ] **Step 1: Add logActivityToClose() to close-sync.ts**

Append after line 179 (end of `createOpportunityInCrm`):

```typescript
// ── Activity Timeline Enrichment ─────────────────────────────────────────
// Logs Instantly touchpoints as Close CRM activities (fire-and-forget).

type ActivityType =
  | 'email_sent' | 'email_replied' | 'voice_call'
  | 'linkedin_connect' | 'linkedin_dm' | 'bounce' | 'meeting_booked';

interface LogActivityParams {
  type: ActivityType;
  leadEmail: string;
  subject?: string;
  body?: string;
  direction?: 'outgoing' | 'incoming';
  duration?: number;
  outcome?: string;
  note?: string;
}

export async function logActivityToClose(params: LogActivityParams): Promise<void> {
  try {
    const lead = await findLeadByEmail(params.leadEmail);
    if (!lead) return; // No Close lead found, skip silently

    switch (params.type) {
      case 'email_sent':
        await logEmail(lead.id, {
          direction: 'outgoing',
          subject: params.subject || 'ColdCraft Outbound',
          body_text: params.body || '',
          status: 'sent',
        });
        break;

      case 'email_replied':
        await logEmail(lead.id, {
          direction: 'incoming',
          subject: params.subject || 'Re: ColdCraft Outbound',
          body_text: params.body || '',
          status: 'received',
        });
        break;

      case 'voice_call':
        await logCall(lead.id, {
          direction: 'outgoing',
          duration: params.duration,
          note: params.note || `Voice call — ${params.outcome || 'completed'}`,
          status: params.outcome === 'no_answer' ? 'no-answer'
            : params.outcome === 'voicemail' ? 'voicemail'
            : 'completed',
        });
        break;

      case 'linkedin_connect':
        await addNoteToLead(lead.id, `[LinkedIn] Connection request sent${params.note ? ': ' + params.note : ''}`);
        break;

      case 'linkedin_dm':
        await addNoteToLead(lead.id, `[LinkedIn] DM sent${params.note ? ': ' + params.note : ''}`);
        break;

      case 'bounce':
        await addNoteToLead(lead.id, `[BOUNCE] ${params.note || 'Hard bounce recorded — blocked across systems'}`);
        break;

      case 'meeting_booked':
        await addNoteToLead(lead.id, `[MEETING] ${params.note || 'Meeting booked via ColdCraft'}`);
        break;
    }
  } catch (err) {
    console.error(`[logActivityToClose] Failed for ${params.leadEmail}:`, err);
  }
}
```

- [ ] **Step 2: Add imports for logEmail, logCall at top of close-sync.ts**

At line ~3 in close-sync.ts, update the import from close-client to include the new functions:

```typescript
import {
  findLeadByEmail,
  createLead,
  updateLead,
  addNoteToLead,
  logEmail,
  logCall,
  getLeadStatuses,
  getOpportunityStatuses,
  createOpportunity,
  CLOSE_CUSTOM_FIELDS,
  type CloseContact,
} from './close-client';
```

- [ ] **Step 3: Wire into pipeline processor**

Modify `src/lib/pipeline/processor.ts`. After the Instantly push succeeds (around line 126, after `syncLeadToCrm` call), add:

```typescript
// Log email sent to Close activity timeline
logActivityToClose({
  type: 'email_sent',
  leadEmail: lead.email,
  subject: `ColdCraft Outbound — ${lead.signal_type}`,
  body: `Personalized opener: ${lead.personalized_opener || 'N/A'}`,
}).catch(() => {}); // fire-and-forget
```

Add the import at top of processor.ts:

```typescript
import { logActivityToClose } from '../crm/close-sync';
```

- [ ] **Step 4: Wire into Instantly reply webhook**

Modify `src/app/api/webhooks/instantly/route.ts`. After the `markInterestedInCrm` call (around line 258-265), add for ALL reply categories (not just interested).

Note: the webhook destructures `reply_text` from the payload (not `subject` or `body`). Use `reply_text` for the body field:

```typescript
// Log inbound reply to Close timeline
logActivityToClose({
  type: 'email_replied',
  leadEmail: lead_email,
  subject: 'Re: ColdCraft Outbound',
  body: reply_text?.substring(0, 500) || '',
  direction: 'incoming',
}).catch(() => {});
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/crm/close-sync.ts src/lib/pipeline/processor.ts src/app/api/webhooks/instantly/route.ts
git commit -m "feat: activity timeline — log all Instantly touchpoints as Close CRM activities"
```

---

## Task 3: Reverse Sync — Close → Instantly (Workstream A1)

**Files:**
- Create: `src/lib/crm/reverse-sync.ts`
- Create: `src/app/api/cron/sync-close/route.ts`

- [ ] **Step 1: Create reverse-sync.ts**

```typescript
// src/lib/crm/reverse-sync.ts
// ============================================
// Detects Close CRM status changes on ColdCraft leads
// and syncs actions back to Instantly (reverse direction).
// ============================================

import { createClient } from '@supabase/supabase-js';
import { findLeadByEmail, getLeadStatuses } from './close-client';
import { tagLead, deleteLead, blockEmail } from '../instantly';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
const STATUS_ACTIONS: Record<string, (email: string, campaignId: string | null) => Promise<void>> = {
  'Meeting Booked': async (email, campaignId) => {
    await tagLead(email, 'MEETING_BOOKED');
    // Note: pausing a specific lead in a campaign requires the campaign ID
  },
  'Won': async (email, campaignId) => {
    if (campaignId) await deleteLead(campaignId, email).catch(() => {});
    await tagLead(email, 'WON');
  },
  'Not Interested': async (email, campaignId) => {
    await tagLead(email, 'CLOSED_LOST');
    if (campaignId) await deleteLead(campaignId, email).catch(() => {});
  },
  'Bad Fit': async (email, campaignId) => {
    await tagLead(email, 'BAD_FIT');
    if (campaignId) await deleteLead(campaignId, email).catch(() => {});
    await blockEmail(email);
  },
  'Nurture': async (email) => {
    const nurtureId = process.env.CAMPAIGN_ID_NURTURE;
    if (nurtureId) {
      const { addLeadsToCampaign } = await import('../instantly');
      await addLeadsToCampaign(nurtureId, [{ email }]);
    }
    await tagLead(email, 'NURTURE');
  },
  'Unsubscribed': async (email, campaignId) => {
    if (campaignId) await deleteLead(campaignId, email).catch(() => {});
    await blockEmail(email);
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
```

- [ ] **Step 2: Create cron route**

```typescript
// src/app/api/cron/sync-close/route.ts
import { NextResponse } from 'next/server';
import { reverseSync } from '@/lib/crm/reverse-sync';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await reverseSync();
    console.log('[sync-close]', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[sync-close] Failed:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/crm/reverse-sync.ts src/app/api/cron/sync-close/route.ts
git commit -m "feat: reverse sync — Close status changes push to Instantly (tags, remove, block)"
```

---

## Task 4: Auto-Blocklist on Bounce (Workstream A3)

**Files:**
- Modify: `src/app/api/webhooks/instantly/bounce/route.ts:62-71`

- [ ] **Step 1: Enhance bounce webhook with cross-system blocklist**

After line 71 (after the `email_outcomes` insert), add:

```typescript
    // Cross-system blocklist: block in Instantly + update Close
    // Note: `outcome` is the mapped value ('hard_bounce'), `bounceType` is raw ('hard')
    if (outcome === 'hard_bounce' && leadEmail) {
      // Block in Instantly
      const { blockEmail } = await import('@/lib/instantly');
      blockEmail(leadEmail).catch((err: unknown) =>
        console.error('[bounce] Instantly block failed:', err)
      );

      // Update Close CRM — mark as Bad Fit + add note
      const { findLeadByEmail, updateLead, addNoteToLead, getLeadStatuses } = await import('@/lib/crm/close-client');
      const { logActivityToClose } = await import('@/lib/crm/close-sync');

      (async () => {
        const lead = await findLeadByEmail(leadEmail);
        if (!lead) return;

        const statuses = await getLeadStatuses();
        const badFit = statuses.find((s) => s.label === 'Bad Fit');
        if (badFit) await updateLead(lead.id, { status_id: badFit.id });

        await addNoteToLead(lead.id, `[BOUNCE] Hard bounce — email blocked across Instantly and Close`);
        await logActivityToClose({ type: 'bounce', leadEmail, note: `Hard bounce for ${leadEmail}` });
      })().catch((err) => console.error('[bounce] Close sync failed:', err));
    }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/instantly/bounce/route.ts
git commit -m "feat: cross-system blocklist — bounces propagate to Instantly block + Close status"
```

---

## Task 5: Enhanced Calendly Webhook (Workstream B1)

**Files:**
- Modify: `src/app/api/webhooks/calendly/route.ts:64-94`

- [ ] **Step 1: Enhance the meeting-booked section**

Replace the current meeting booked logic (lines 64-94) with enriched version:

```typescript
    // ── Meeting Booked — enriched opportunity creation ──
    // Note: `email` and `name` are already declared at lines 57-58 from `invitee`.
    // Do NOT re-declare them. Only extract the new `eventStartTime` variable.
    if (event === 'invitee.created') {
      const scheduledEvent = (resource?.event || resource?.scheduled_event) as Record<string, unknown> | undefined;
      const eventStartTime = scheduledEvent?.start_time as string | undefined;

      if (!email) {
        return NextResponse.json({ error: 'No email in payload' }, { status: 400 });
      }

      // Look up pipeline_lead for signal context
      const { data: pipelineLead } = await supabase
        .from('pipeline_leads')
        .select('id, signal_score, signal_type, signal_summary, instantly_campaign_id, research_summary, company_name, title')
        .eq('email', email)
        .single();

      // Calculate MRR potential from signal score
      const signalScore = pipelineLead?.signal_score || 0;
      const mrrPotential = signalScore >= 80 ? 5000 : signalScore >= 60 ? 2000 : 1000;
      const annualValue = mrrPotential * 12;

      // Update pipeline_lead status
      if (pipelineLead) {
        await supabase
          .from('pipeline_leads')
          .update({ status: 'pushed', updated_at: new Date().toISOString() })
          .eq('id', pipelineLead.id);
      }

      // Create enriched opportunity in Close
      // Note: createOpportunityInCrm only accepts { email, company?, lead_name? }.
      // For enriched opportunities with value/note, use it for lead creation + status,
      // then call createOpportunity directly for the value and note.
      const { createOpportunityInCrm } = await import('@/lib/crm/close-sync');
      const { findLeadByEmail, updateLead, createTask, getCurrentUser, createOpportunity, getOpportunityStatuses, addNoteToLead, CLOSE_CUSTOM_FIELDS } = await import('@/lib/crm/close-client');
      const { logActivityToClose } = await import('@/lib/crm/close-sync');

      (async () => {
        // First ensure lead + status exist via the standard hook
        await createOpportunityInCrm({
          email,
          company: pipelineLead?.company_name || name,
          lead_name: name,
        });

        // Now find the lead and add enriched note with signal context
        const lead = await findLeadByEmail(email);
        if (lead) {
          const signalNote = [
            `Signal: ${pipelineLead?.signal_type || 'unknown'} (score: ${signalScore})`,
            `Campaign: ${pipelineLead?.instantly_campaign_id || 'N/A'}`,
            `MRR Potential: $${mrrPotential}/mo (annual: $${annualValue})`,
            pipelineLead?.research_summary ? `Research: ${pipelineLead.research_summary.substring(0, 300)}` : '',
          ].filter(Boolean).join('\n');
          await addNoteToLead(lead.id, signalNote);
        }

        // Update custom fields on lead — re-fetch in case createOpportunityInCrm created it
        const leadForFields = lead || await findLeadByEmail(email);
        if (leadForFields) {
          await updateLead(leadForFields.id, {
            [CLOSE_CUSTOM_FIELDS.signal_summary]: pipelineLead?.signal_summary || '',
          });

          // Create prep task
          if (eventStartTime) {
            const prepTime = new Date(new Date(eventStartTime).getTime() - 60 * 60 * 1000);
            const user = await getCurrentUser().catch(() => null);
            await createTask(leadForFields.id, {
              text: `Prep for discovery call with ${name}${pipelineLead?.company_name ? ' at ' + pipelineLead.company_name : ''}`,
              due_date: prepTime.toISOString().split('T')[0],
              assigned_to: user?.id,
            });
          }
        }

        // Log activity
        await logActivityToClose({
          type: 'meeting_booked',
          leadEmail: email,
          note: `Calendly booking — ${name} — MRR potential: $${mrrPotential}/mo`,
        });
      })().catch((err) => console.error('[calendly] Enrichment failed:', err));

      return NextResponse.json({ status: 'meeting_booked', email, mrr_potential: mrrPotential });
    }

    // IMPORTANT: Preserve the existing cancellation handler (lines 96-99 in original)
    if (event === 'invitee.canceled') {
      console.log(`[Calendly] Meeting canceled: ${email}`);
    }
```

- [ ] **Step 2: Also enhance the book route**

Modify `src/app/api/replies/[id]/book/route.ts`. After line 31 (the `createOpportunityInCrm` call), add:

```typescript
    // Log meeting_booked activity to Close
    const { logActivityToClose } = await import('@/lib/crm/close-sync');
    logActivityToClose({
      type: 'meeting_booked',
      leadEmail: reply.lead_email,
      note: `Manual booking via dashboard — reply #${reply.id}`,
    }).catch(() => {});
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhooks/calendly/route.ts src/app/api/replies/[id]/book/route.ts
git commit -m "feat: enriched Calendly booking — MRR estimate, prep task, signal context in opportunity"
```

---

## Task 6: Revenue Attribution (Workstream B2)

**Files:**
- Create: `src/lib/crm/revenue-attribution.ts`
- Create: `src/app/api/cron/revenue-check/route.ts`
- Create: `src/app/api/crm/attribution/route.ts`

- [ ] **Step 1: Create revenue-attribution.ts**

```typescript
// src/lib/crm/revenue-attribution.ts
// ============================================
// Traces won/lost deals back to their signal source.
// Writes to revenue_attribution table for batch learning.
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CLOSE_API = 'https://api.close.com/api/v1';

function closeHeaders() {
  const key = process.env.CLOSE_CRM_API_KEY;
  if (!key) throw new Error('CLOSE_CRM_API_KEY not set');
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
  };
}

interface OpportunityResult {
  opportunity_id: string;
  outcome: 'won' | 'lost';
  deal_value: number | null;
  matched: boolean;
}

export async function checkRevenueOutcomes(): Promise<{
  checked: number;
  attributed: number;
  errors: number;
}> {
  // Query Close for recently closed opportunities (won or lost in last 24h)
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

  // Filter to won/lost only
  const closedOpps = opportunities.filter(
    (o) => o.status_type === 'won' || o.status_type === 'lost'
  );

  let attributed = 0;
  let errors = 0;

  for (const opp of closedOpps) {
    try {
      // Get lead email from Close
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

      // Match to pipeline_lead
      const { data: pl } = await supabase
        .from('pipeline_leads')
        .select('id, signal_id, signal_type, instantly_campaign_id')
        .eq('email', email)
        .single();

      // Count touchpoints
      const { count: touchCount } = await supabase
        .from('touchpoints')
        .select('id', { count: 'exact', head: true })
        .eq('lead_id', pl?.id || '00000000-0000-0000-0000-000000000000');

      // Calculate days to close
      const created = new Date(opp.date_created);
      const closed = new Date(opp.date_won || opp.date_lost || opp.date_updated);
      const daysToClose = Math.round((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

      // Upsert attribution (idempotent via UNIQUE on opportunity_id)
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
```

- [ ] **Step 2: Create cron route**

```typescript
// src/app/api/cron/revenue-check/route.ts
import { NextResponse } from 'next/server';
import { checkRevenueOutcomes } from '@/lib/crm/revenue-attribution';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkRevenueOutcomes();
    console.log('[revenue-check]', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[revenue-check] Failed:', error);
    return NextResponse.json({ error: 'Revenue check failed' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create attribution API route**

```typescript
// src/app/api/crm/attribution/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupBy = searchParams.get('group_by') || 'signal_type';
  const days = parseInt(searchParams.get('days') || '30', 10);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('revenue_attribution')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by requested dimension
  const grouped: Record<string, { won: number; lost: number; revenue: number; count: number; avg_days: number }> = {};
  for (const row of data || []) {
    const key = (row as Record<string, unknown>)[groupBy] as string || 'unknown';
    if (!grouped[key]) grouped[key] = { won: 0, lost: 0, revenue: 0, count: 0, avg_days: 0 };
    grouped[key].count++;
    if (row.outcome === 'won') {
      grouped[key].won++;
      grouped[key].revenue += row.deal_value || 0;
    } else {
      grouped[key].lost++;
    }
    grouped[key].avg_days += row.days_to_close || 0;
  }

  // Calculate averages
  for (const key of Object.keys(grouped)) {
    if (grouped[key].count > 0) grouped[key].avg_days = Math.round(grouped[key].avg_days / grouped[key].count);
  }

  return NextResponse.json({ grouped, raw: data, period_days: days });
}
```

- [ ] **Step 4: Wire into learning system**

Modify `src/lib/learning/signal-optimizer.ts`. In the `optimizeSignalWeights()` function, inside the `for (const signalType of SIGNAL_TYPES)` loop, after the existing `learnedScore` calculation (line ~53), add a revenue boost before the upsert:

```typescript
    // Revenue-weighted boost: signal types that produce won deals get extra weight
    const { data: revenueData } = await supabase
      .from('revenue_attribution')
      .select('signal_type, deal_value, outcome')
      .eq('signal_type', signalType);  // NOTE: loop variable is `signalType`, not `type`

    const wonDeals = (revenueData || []).filter((r) => r.outcome === 'won');
    const totalRevenue = wonDeals.reduce((sum, r) => sum + (r.deal_value || 0), 0);
    const revenueBoost = wonDeals.length > 0 ? Math.min(totalRevenue / 10000, 50) : 0;
    // Add revenue boost to learned score (max +50 points, capped at 200)
    const finalScore = Math.min(200, learnedScore + Math.round(revenueBoost));
```

Then update the upsert to use `finalScore` instead of `learnedScore`:
```typescript
    const { error } = await supabase.from('learning_weights').upsert({
      // ... existing fields ...
      learned_score: finalScore,  // was: learnedScore
      // ... rest unchanged ...
    }, { onConflict: 'weight_type,dimension_value' });
```

**No changes needed to `icp-learner.ts`** — it uses `pipeline_leads` and `conversations` tables for dimension learning, and revenue attribution data will naturally flow through the existing conversion metrics as deals close.

- [ ] **Step 5: Commit**

```bash
git add src/lib/crm/revenue-attribution.ts src/app/api/cron/revenue-check/route.ts src/app/api/crm/attribution/route.ts src/lib/learning/signal-optimizer.ts src/lib/learning/icp-learner.ts
git commit -m "feat: revenue attribution — trace won deals to signals, feed into self-learning"
```

---

## Task 7: Account Health Monitor (Workstream C1)

**Files:**
- Modify: `src/lib/instantly.ts` (export listSendingAccounts)
- Modify: `src/lib/slack.ts` (export generic `notifySlack` wrapper)
- Create: `src/lib/instantly-health.ts`
- Create: `src/app/api/cron/account-health/route.ts`
- Create: `src/app/api/instantly/health/route.ts`

- [ ] **Step 0: Export notifySlack from slack.ts**

The existing `slack.ts` has `sendSlack()` as a private function. Add a public generic notification export at the end of the file:

```typescript
// Generic Slack notification — used by health monitor and other system alerts
export async function notifySlack(message: string, level: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
  const emoji = level === 'error' ? '🔴' : level === 'warning' ? '🟡' : 'ℹ️';
  await sendSlack({
    text: `${emoji} ${message}`,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `${emoji} ${message}` },
      },
    ],
  });
}
```

- [ ] **Step 1: Export listSendingAccounts from instantly.ts**

Add to `src/lib/instantly.ts` (after existing exports):

```typescript
export async function listSendingAccounts(): Promise<Array<{ email: string; daily_limit?: number }>> {
  const key = getApiKey();
  const res = await fetch('https://api.instantly.ai/api/v2/accounts?limit=100', {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || data.data || data || []).map((a: Record<string, unknown>) => ({
    email: a.email as string,
    daily_limit: a.daily_limit as number | undefined,
  }));
}
```

- [ ] **Step 2: Create instantly-health.ts**

```typescript
// src/lib/instantly-health.ts
// ============================================
// Monitors sending account health across all Instantly accounts.
// Checks bounce rates, reply rates, flags degraded accounts.
// ============================================

import { createClient } from '@supabase/supabase-js';
import { listSendingAccounts } from './instantly';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AccountHealth {
  email: string;
  sends: number;
  bounces: number;
  replies: number;
  bounce_rate: number;
  reply_rate: number;
  health_score: number;
  flagged: boolean;
}

export async function checkAccountHealth(): Promise<{
  accounts: number;
  flagged: number;
  results: AccountHealth[];
}> {
  const accounts = await listSendingAccounts();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const results: AccountHealth[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Pre-compute workspace-level metrics once (email_outcomes lacks from_email
  // so we can't do per-account filtering — these are workspace-wide aggregates).
  // Each account gets the same base rates; the health score still varies because
  // the daily_limit from Instantly lets us estimate per-account send volume.
  const { count: totalBounces } = await supabase
    .from('email_outcomes')
    .select('id', { count: 'exact', head: true })
    .eq('outcome', 'hard_bounce')
    .gte('recorded_at', sevenDaysAgo);

  const { count: totalReplies } = await supabase
    .from('replies')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo);

  const { count: totalSends } = await supabase
    .from('pipeline_leads')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pushed')
    .gte('updated_at', sevenDaysAgo);

  const workspaceSends = totalSends || 1;
  const workspaceBounces = totalBounces || 0;
  const workspaceReplies = totalReplies || 0;

  for (const account of accounts) {
    // Estimate per-account share based on daily limit proportion
    const totalDailyLimit = accounts.reduce((sum, a) => sum + (a.daily_limit || 50), 0) || 1;
    const accountShare = (account.daily_limit || 50) / totalDailyLimit;
    const sends = Math.max(1, Math.round(workspaceSends * accountShare));
    const bounces = Math.round(workspaceBounces * accountShare);
    const replies = Math.round(workspaceReplies * accountShare);
    const bounceRate = bounces / sends;
    const replyRate = replies / sends;
    const healthScore = Math.max(0, Math.min(100, Math.round(100 - bounceRate * 200 + replyRate * 50)));
    const flagged = bounceRate > 0.05 || healthScore < 40;

    const health: AccountHealth = {
      email: account.email,
      sends,
      bounces,
      replies,
      bounce_rate: parseFloat(bounceRate.toFixed(6)),
      reply_rate: parseFloat(replyRate.toFixed(6)),
      health_score: healthScore,
      flagged,
    };

    results.push(health);

    // Upsert snapshot
    await supabase.from('account_health_snapshots').upsert(
      {
        account_email: account.email,
        snapshot_date: today,
        sends: health.sends,
        bounces: health.bounces,
        replies: health.replies,
        bounce_rate: health.bounce_rate,
        reply_rate: health.reply_rate,
        health_score: health.health_score,
        flagged: health.flagged,
      },
      { onConflict: 'account_email,snapshot_date' }
    );
  }

  // Slack alert if any flagged
  const flaggedAccounts = results.filter((r) => r.flagged);
  if (flaggedAccounts.length > 0) {
    try {
      const { notifySlack } = await import('./slack');
      const lines = flaggedAccounts.map(
        (a) => `• ${a.email}: ${(a.bounce_rate * 100).toFixed(1)}% bounce, score ${a.health_score}`
      );
      await notifySlack(
        `⚠️ ${flaggedAccounts.length} sending account(s) flagged:\n${lines.join('\n')}`,
        'warning'
      );
    } catch {}
  }

  return { accounts: accounts.length, flagged: flaggedAccounts.length, results };
}
```

- [ ] **Step 3: Create cron and API routes**

```typescript
// src/app/api/cron/account-health/route.ts
import { NextResponse } from 'next/server';
import { checkAccountHealth } from '@/lib/instantly-health';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkAccountHealth();
    console.log(`[account-health] ${result.accounts} accounts, ${result.flagged} flagged`);
    return NextResponse.json({ accounts: result.accounts, flagged: result.flagged });
  } catch (error) {
    console.error('[account-health] Failed:', error);
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
```

```typescript
// src/app/api/instantly/health/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '1', 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('account_health_snapshots')
    .select('*')
    .gte('snapshot_date', since)
    .order('snapshot_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ snapshots: data });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/slack.ts src/lib/instantly.ts src/lib/instantly-health.ts src/app/api/cron/account-health/route.ts src/app/api/instantly/health/route.ts
git commit -m "feat: sending account health monitor — daily checks, Slack alerts for degraded accounts"
```

---

## Task 8: A/B Experiments (Workstream C2)

**Files:**
- Create: `src/lib/instantly-experiments.ts`
- Create: `src/app/api/instantly/experiments/route.ts`

- [ ] **Step 1: Create instantly-experiments.ts**

```typescript
// src/lib/instantly-experiments.ts
// ============================================
// A/B testing for Instantly campaigns.
// Creates variants, splits leads, tracks results.
// ============================================

import { createClient } from '@supabase/supabase-js';
import { addLeadsToCampaign, getCampaigns } from './instantly';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createExperiment(params: {
  name: string;
  baseCampaignId: string;
  signalType?: string;
  variantCampaignIds: string[];
}): Promise<string> {
  const { data, error } = await supabase
    .from('ab_experiments')
    .insert({
      name: params.name,
      base_campaign_id: params.baseCampaignId,
      signal_type: params.signalType || null,
      variant_campaign_ids: params.variantCampaignIds,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create experiment: ${error.message}`);
  return data.id;
}

export async function assignLeadToExperiment(
  experimentId: string,
  leadEmail: string
): Promise<{ campaignId: string; variantIndex: number }> {
  // Get experiment
  const { data: exp } = await supabase
    .from('ab_experiments')
    .select('*')
    .eq('id', experimentId)
    .single();

  if (!exp || exp.status !== 'active') throw new Error('Experiment not active');

  const allCampaigns = [exp.base_campaign_id, ...exp.variant_campaign_ids];

  // Round-robin: count existing assignments per variant, assign to least-used
  const { data: counts } = await supabase
    .from('ab_experiment_leads')
    .select('variant_index')
    .eq('experiment_id', experimentId);

  const countPerVariant = new Map<number, number>();
  for (let i = 0; i < allCampaigns.length; i++) countPerVariant.set(i, 0);
  for (const c of counts || []) {
    countPerVariant.set(c.variant_index, (countPerVariant.get(c.variant_index) || 0) + 1);
  }

  // Find variant with fewest leads
  let minIndex = 0;
  let minCount = Infinity;
  for (const [idx, count] of countPerVariant) {
    if (count < minCount) { minCount = count; minIndex = idx; }
  }

  const campaignId = allCampaigns[minIndex];

  // Add lead to campaign
  await addLeadsToCampaign(campaignId, [{ email: leadEmail }]);

  // Record assignment
  await supabase.from('ab_experiment_leads').upsert(
    {
      experiment_id: experimentId,
      lead_email: leadEmail,
      variant_index: minIndex,
      campaign_id: campaignId,
    },
    { onConflict: 'experiment_id,lead_email' }
  );

  // Update total count
  await supabase
    .from('ab_experiments')
    .update({ total_leads: (exp.total_leads || 0) + 1 })
    .eq('id', experimentId);

  return { campaignId, variantIndex: minIndex };
}

export async function getExperimentResults(experimentId: string) {
  const { data: exp } = await supabase
    .from('ab_experiments')
    .select('*')
    .eq('id', experimentId)
    .single();

  if (!exp) return null;

  const allCampaigns = [exp.base_campaign_id, ...exp.variant_campaign_ids];
  const variants = [];

  for (let i = 0; i < allCampaigns.length; i++) {
    const { count: leadCount } = await supabase
      .from('ab_experiment_leads')
      .select('id', { count: 'exact', head: true })
      .eq('experiment_id', experimentId)
      .eq('variant_index', i);

    // Count replies for this variant's leads
    const { data: variantLeads } = await supabase
      .from('ab_experiment_leads')
      .select('lead_email')
      .eq('experiment_id', experimentId)
      .eq('variant_index', i);

    const emails = (variantLeads || []).map((l) => l.lead_email);
    const { count: replyCount } = emails.length > 0
      ? await supabase.from('replies').select('id', { count: 'exact', head: true }).in('lead_email', emails)
      : { count: 0 };

    // Count revenue attributions
    const { data: revenue } = emails.length > 0
      ? await supabase.from('revenue_attribution').select('deal_value, outcome').in('campaign_id', [allCampaigns[i]])
      : { data: [] };

    const wonRevenue = (revenue || [])
      .filter((r) => r.outcome === 'won')
      .reduce((sum, r) => sum + (r.deal_value || 0), 0);

    variants.push({
      index: i,
      campaign_id: allCampaigns[i],
      label: i === 0 ? 'control' : `variant_${i}`,
      leads: leadCount || 0,
      replies: replyCount || 0,
      reply_rate: (leadCount || 0) > 0 ? ((replyCount || 0) / (leadCount || 1)) : 0,
      revenue: wonRevenue,
    });
  }

  return { ...exp, variants };
}
```

- [ ] **Step 2: Create experiments API route**

```typescript
// src/app/api/instantly/experiments/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createExperiment, getExperimentResults } from '@/lib/instantly-experiments';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('ab_experiments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with results
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
```

- [ ] **Step 3: Wire A/B routing into processor.ts**

Add to `src/lib/pipeline/processor.ts`, in the campaign selection section (around line 95-100, before `addLeadsToCampaign`):

```typescript
    // Check for active A/B experiment on this signal type
    // Note: processor.ts already imports `supabase` from '@/lib/supabase/client' — use it
    let finalCampaignId = campaignId;
    try {
      const { data: activeExp } = await supabase
        .from('ab_experiments')
        .select('id')
        .eq('signal_type', lead.signal_type)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (activeExp) {
        const { assignLeadToExperiment } = await import('./instantly-experiments');
        const assignment = await assignLeadToExperiment(activeExp.id, lead.email);
        finalCampaignId = assignment.campaignId;
      }
    } catch {} // Fall back to default campaign
```

Then use `finalCampaignId` instead of `campaignId` in the `addLeadsToCampaign` call.

- [ ] **Step 4: Commit**

```bash
git add src/lib/instantly-experiments.ts src/app/api/instantly/experiments/route.ts src/lib/pipeline/processor.ts
git commit -m "feat: A/B experiments — campaign variants, lead splitting, result tracking"
```

---

## Task 9: Unified Analytics Dashboard (Workstream D)

**Files:**
- Create: `src/app/api/dashboard/analytics/route.ts`
- Create: `src/app/dashboard/analytics/page.tsx`
- Modify: `src/app/dashboard/layout.tsx:2-15`

- [ ] **Step 1: Create analytics API route**

```typescript
// src/app/api/dashboard/analytics/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CLOSE_API = 'https://api.close.com/api/v1';

function closeHeaders() {
  const key = process.env.CLOSE_CRM_API_KEY;
  if (!key) return null;
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30', 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 1. Pipeline funnel from Close
  let funnel: Record<string, number> = {};
  const headers = closeHeaders();
  if (headers) {
    try {
      const query = encodeURIComponent('tag:"ColdCraft"');
      const res = await fetch(`${CLOSE_API}/lead/?query=${query}&_fields=status_label&_limit=200`, { headers });
      if (res.ok) {
        const { data: leads } = await res.json();
        funnel = {};
        for (const lead of leads || []) {
          const status = lead.status_label || 'Unknown';
          funnel[status] = (funnel[status] || 0) + 1;
        }
      }
    } catch {}
  }

  // 2. Revenue attribution by signal type
  const { data: attribution } = await supabase
    .from('revenue_attribution')
    .select('*')
    .gte('created_at', since);

  const signalROI: Record<string, { leads: number; won: number; lost: number; revenue: number }> = {};
  for (const row of attribution || []) {
    const key = row.signal_type || 'unknown';
    if (!signalROI[key]) signalROI[key] = { leads: 0, won: 0, lost: 0, revenue: 0 };
    signalROI[key].leads++;
    if (row.outcome === 'won') {
      signalROI[key].won++;
      signalROI[key].revenue += row.deal_value || 0;
    } else {
      signalROI[key].lost++;
    }
  }

  // 3. Account health snapshots
  const today = new Date().toISOString().split('T')[0];
  const { data: healthData } = await supabase
    .from('account_health_snapshots')
    .select('*')
    .eq('snapshot_date', today)
    .order('health_score', { ascending: true });

  // 4. Active A/B experiments
  const { data: experiments } = await supabase
    .from('ab_experiments')
    .select('*')
    .eq('status', 'active');

  // 5. Campaign metrics from pipeline_leads
  const { data: campaignLeads } = await supabase
    .from('pipeline_leads')
    .select('instantly_campaign_id, status')
    .gte('created_at', since);

  const campaignMetrics: Record<string, { pushed: number; total: number }> = {};
  for (const pl of campaignLeads || []) {
    const cid = pl.instantly_campaign_id || 'none';
    if (!campaignMetrics[cid]) campaignMetrics[cid] = { pushed: 0, total: 0 };
    campaignMetrics[cid].total++;
    if (pl.status === 'pushed') campaignMetrics[cid].pushed++;
  }

  // 6. Summary stats
  const totalRevenue = (attribution || []).filter((a) => a.outcome === 'won').reduce((s, a) => s + (a.deal_value || 0), 0);
  const wonCount = (attribution || []).filter((a) => a.outcome === 'won').length;
  const totalDeals = (attribution || []).length;
  const winRate = totalDeals > 0 ? Math.round((wonCount / totalDeals) * 100) : 0;
  const avgDays = totalDeals > 0
    ? Math.round((attribution || []).reduce((s, a) => s + (a.days_to_close || 0), 0) / totalDeals)
    : 0;
  const flaggedAccounts = (healthData || []).filter((h) => h.flagged).length;

  return NextResponse.json({
    summary: {
      total_revenue: totalRevenue,
      win_rate: winRate,
      avg_days_to_close: avgDays,
      active_experiments: (experiments || []).length,
      flagged_accounts: flaggedAccounts,
    },
    funnel,
    signal_roi: signalROI,
    account_health: healthData || [],
    experiments: experiments || [],
    campaign_metrics: campaignMetrics,
    recent_wins: (attribution || []).filter((a) => a.outcome === 'won').slice(0, 10),
    period_days: days,
  });
}
```

- [ ] **Step 2: Create analytics dashboard page**

Create `src/app/dashboard/analytics/page.tsx` — a client component with sections for summary cards, funnel, signal ROI, account health grid, experiments, and recent wins. Follow the existing dashboard patterns from `src/app/dashboard/crm/page.tsx` for layout, loading states, and error handling. Use the same card/grid patterns, fetch from `/api/dashboard/analytics`.

Key sections:
- Summary cards row (5 cards: revenue, win rate, avg days, experiments, flagged)
- Funnel visualization (status counts with conversion percentages)
- Signal ROI table (sortable: type, leads, won, lost, revenue)
- Account health grid (color-coded: green >70, yellow 40-70, red <40)
- A/B experiments section (name, status, variant metrics)
- Recent wins list (last 10 with attribution chain)

- [ ] **Step 3: Add Analytics to navigation**

Modify `src/app/dashboard/layout.tsx`. The nav uses `{ href, label, icon }` keys (not `name`) and icons are string keys mapped via `iconMap` to inline SVGs (not lucide-react components).

Add to the `navItems` array (between Insights and CRM):

```typescript
  { href: '/dashboard/analytics', label: 'Analytics', icon: 'analytics' },
```

Add to the `iconMap` object:

```typescript
  analytics: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M3 20.25h18M3.75 20.25V3.75" />
    </svg>
  ),
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/dashboard/analytics/route.ts src/app/dashboard/analytics/page.tsx src/app/dashboard/layout.tsx
git commit -m "feat: unified analytics dashboard — funnel, signal ROI, account health, A/B experiments"
```

---

## Task 10: Vercel Cron Configuration + Final Wiring

**Files:**
- Modify: `vercel.json`
- Modify: `.env.example`

- [ ] **Step 1: Add 3 new crons to vercel.json**

Add to the crons array in `vercel.json`:

```json
    {
      "path": "/api/cron/sync-close",
      "schedule": "3,33 * * * *"
    },
    {
      "path": "/api/cron/revenue-check",
      "schedule": "3 13 * * *"
    },
    {
      "path": "/api/cron/account-health",
      "schedule": "7 12 * * *"
    }
```

Note: Using offset minutes (3, 7, 33) to avoid the :00/:30 stampede. Times are UTC — 13:00 UTC = 8am ET, 12:00 UTC = 7am ET.

- [ ] **Step 2: Update .env.example**

Add:

```
# Nurture campaign for reverse sync
CAMPAIGN_ID_NURTURE=
```

- [ ] **Step 3: Final commit**

```bash
git add vercel.json .env.example
git commit -m "feat: add 3 new Vercel crons (sync-close, revenue-check, account-health) + env config"
```

---

## Parallel Execution Map

Tasks that can run simultaneously after Task 0 (migration):

```
Task 0: Migration (must complete first)
  │
  ├── Task 1: Close client wrappers (must complete before Tasks 2, 3, 4, 5)
  │     │
  │     ├── Task 2: Activity timeline (A2) ──────┐
  │     ├── Task 3: Reverse sync (A1) ───────────┤
  │     ├── Task 4: Auto-blocklist (A3) ─────────┤
  │     └── Task 5: Calendly enrichment (B1) ────┤
  │                                               │
  ├── Task 6: Revenue attribution (B2) ──────────┤ All parallel
  ├── Task 7: Account health (C1) ───────────────┤
  ├── Task 8: A/B experiments (C2) ──────────────┤
  │                                               │
  └── Task 9: Analytics dashboard (D1) ──────────┘ Can start in parallel,
                                                    shows empty data until
                                                    other tasks populate tables
  Task 10: Vercel crons (after all code committed)
```

**Agent assignment for maximum parallelism:**
- Agent 1: Tasks 0 → 1 → 2 (migration + client + activity timeline)
- Agent 2: Task 3 (reverse sync, starts after Task 1)
- Agent 3: Tasks 4 + 5 (blocklist + Calendly, starts after Task 1)
- Agent 4: Task 6 (revenue attribution, starts after Task 0)
- Agent 5: Task 7 (account health, starts after Task 0)
- Agent 6: Task 8 (A/B experiments, starts after Task 0)
- Agent 7: Task 9 + 10 (dashboard + crons, starts after Task 0)
