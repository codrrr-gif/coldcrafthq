# Close CRM + Instantly AI Advancement Systems

**Date:** 2026-03-25
**Status:** Approved
**Scope:** 8 systems across 4 parallel workstreams

## Context

ColdCraft has a mature GTM engine: 66 TypeScript files, 20+ DB tables, 39 API routes, 9 subsystems. Close CRM and Instantly AI are the two core sales systems, but they operate as one-directional silos. Signals flow in, emails go out, replies get classified — but Close pipeline changes never flow back to Instantly, revenue outcomes never feed the self-learning system, and sending account health goes unmonitored.

This spec defines 8 advancement systems that close these loops and add intelligence.

## Architecture Decision: Close Change Detection

Close CRM lacks native outbound webhooks. We use **cron polling** (every 30 minutes) to detect status changes on ColdCraft-tagged leads. This matches the existing cron-based architecture (5 crons already running) and adds no external dependencies. 30-minute interval balances freshness vs Vercel cron cost (48 invocations/day).

---

## Workstream A: Sync Layer

### A1 — Bi-directional Close <> Instantly Sync

**Purpose:** When a rep changes a lead's status in Close, automatically update Instantly to match.

**New file:** `src/lib/crm/reverse-sync.ts`

Exports `reverseSync()` which:
1. Determines watermark: queries `MAX(synced_at)` from `close_sync_log`, falls back to `NOW() - 30 minutes` if table empty
2. Queries Close via `findLeadByEmail()` pattern — searches for leads with tag "ColdCraft" updated since watermark using Close query API: `GET /lead/?query=tag:"ColdCraft" date_updated > "{watermark}"`
3. Compares current status against `close_sync_log`
4. For each changed lead, looks up `campaign_id` from `pipeline_leads` table (column `instantly_campaign_id`) to get the Instantly campaign context
5. Executes the status mapping:

| Close Status | Instantly Action |
|---|---|
| Meeting Booked | Tag "MEETING_BOOKED", pause from campaign |
| Won | Remove from campaign (using looked-up campaign_id), tag "WON" |
| Not Interested | Tag "CLOSED_LOST", remove from campaign |
| Bad Fit | Tag "BAD_FIT", remove from campaign, block email |
| Nurture | Move to nurture campaign (env: `CAMPAIGN_ID_NURTURE`) |
| Unsubscribed | Remove from campaign, block email |

6. Updates `close_sync_log` with new status, timestamp, and campaign_id

**New file:** `src/app/api/cron/sync-close/route.ts`
- Cron: every 30 minutes
- Validates CRON_SECRET
- Calls `reverseSync()`
- Returns sync summary (checked, changed, errors)

**Dependencies:** `close-client.ts` (`findLeadByEmail()`, `getLeadStatuses()`), `instantly.ts` (`tagLead()`, `deleteLead()`, `blockEmail()`)

**New env var:** `CAMPAIGN_ID_NURTURE` — Instantly campaign ID for nurture/re-engagement sequences

### A2 — Activity Timeline Enrichment

**Purpose:** Log every Instantly touchpoint as a Close activity so reps see full context.

**Enhanced file:** `src/lib/crm/close-sync.ts`

New export `logActivityToClose(params)`:

```typescript
type ActivityType = 'email_sent' | 'email_replied' | 'voice_call' | 'linkedin_connect' | 'linkedin_dm' | 'bounce' | 'meeting_booked';

interface LogActivityParams {
  type: ActivityType;
  leadEmail: string;
  subject?: string;
  body?: string;
  direction?: 'outgoing' | 'incoming';
  duration?: number;    // seconds, for calls
  outcome?: string;     // for calls: completed, no_answer, voicemail
  note?: string;        // freeform context
}
```

Routes to the appropriate Close activity API:
- email_sent/replied → `POST /activity/email/` with `{ lead_id, direction, subject, body_text }`
- voice_call → `POST /activity/call/` with `{ lead_id, direction, duration, note, status }`
- linkedin_connect/dm → `POST /activity/note/` with `{ lead_id, note: "[LinkedIn] ..." }`
- bounce → `POST /activity/note/` with `{ lead_id, note: "[BOUNCE] ..." }`
- meeting_booked → `POST /activity/note/` with `{ lead_id, note: "[MEETING] ..." }`

**Enhanced file:** `src/lib/crm/close-client.ts` — add two new wrappers:

```typescript
// POST /activity/email/
export async function logEmail(leadId: string, params: {
  direction: 'outgoing' | 'incoming';
  subject: string;
  body_text: string;
  status?: 'sent' | 'received';
}): Promise<void>

// POST /activity/call/
export async function logCall(leadId: string, params: {
  direction: 'outgoing' | 'incoming';
  duration?: number;
  note?: string;
  status?: 'completed' | 'no-answer' | 'voicemail';
}): Promise<void>
```

**Integration points (fire-and-forget calls):**
- `src/lib/pipeline/processor.ts` step 4 → log "email_sent" after Instantly push
- `src/app/api/webhooks/instantly/route.ts` → log "email_replied" on inbound reply
- `src/app/api/webhooks/instantly/bounce/route.ts` → log "bounce"
- `src/lib/voice/vapi.ts` → log "voice_call" after call completion
- `src/lib/linkedin/heyreach.ts` → log "linkedin_connect" and "linkedin_dm"

### A3 — Auto-Blocklist Management

**Purpose:** When a lead bounces, gets marked hard_no, or unsubscribes, propagate the block across both systems.

**Enhanced file:** `src/app/api/webhooks/instantly/bounce/route.ts`

Add after recording to `email_outcomes`:
1. Call `blockEmail(email)` in Instantly (already exists but not called on bounce)
2. Find lead in Close via `findLeadByEmail(email)` — if found:
   - Call `updateLead(leadId, { status_id: badFitStatusId })` in Close
   - Call `addNoteToLead(leadId, '[BOUNCE] Hard bounce recorded — blocked across systems')` in Close
3. Log "bounce" activity via `logActivityToClose()`

**Enhanced in reverse-sync (A1):** When Close status changes to "Unsubscribed" or "Bad Fit", blocklist the email in Instantly via `blockEmail()`.

---

## Workstream B: Pipeline Automation

### B1 — Auto-Opportunity from Calendly

**Purpose:** When someone books via Calendly, create a rich Close opportunity with full signal context.

**Enhanced file:** `src/app/api/webhooks/calendly/route.ts`

Current behavior: updates pipeline_lead status to "pushed" + calls `createOpportunityInCrm()` (basic).

New behavior:
1. Look up `pipeline_lead` by invitee email → get `signal_score`, `signal_type`, `signal_summary`, `instantly_campaign_id`, `research_summary`
2. Calculate MRR Potential estimate: `signal_score >= 80 → $5k, >= 60 → $2k, else $1k` (uses `signal_score`, not `icp_score` which does not exist)
3. Create opportunity in Close:
   - Pipeline: "ColdCraft Outbound"
   - Stage: "Discovery Call Scheduled"
   - Value: MRR Potential * 12 (annual)
   - Note: Signal type, campaign, touch count, research summary
4. Create Close task via `POST /task/`:
   - Text: "Prep for discovery call with {name} at {company}"
   - Due: 1 hour before meeting time (from Calendly event start_time)
   - Assigned to: current user (from `GET /me/`)
5. Update custom fields on lead:
   - `Booked Via`: "calendly"
   - `MRR Potential`: calculated value
6. Log "meeting_booked" activity via `logActivityToClose()`
7. Keep existing behavior: pipeline_lead status stays "pushed" (no schema change needed)

**Also enhanced:** `src/app/api/replies/[id]/book/route.ts` — same enrichment for manual bookings (Booked Via: "direct_reply").

**Cross-dependency note:** B1 calls `logActivityToClose()` defined by A2. The function signature is defined above so both can build in parallel — B1 imports the function, A2 implements it.

### B2 — Revenue Attribution Pipeline

**Purpose:** When a deal closes in Close, trace it back to its signal source. Write to `revenue_attribution` table so existing batch learning optimizers can incorporate deal outcomes.

**New file:** `src/lib/crm/revenue-attribution.ts`

Exports `checkRevenueOutcomes()`:
1. Query Close for opportunities updated in last 24 hours where status type = "won" or "lost" via `GET /opportunity/?query=date_updated > "24 hours ago"`
2. For each opportunity, get lead_id → find lead email → match to `pipeline_leads` by email
3. If matched, trace to `raw_signals` via `signal_id` column on pipeline_leads
4. Insert into `revenue_attribution` table (with `ON CONFLICT (opportunity_id) DO NOTHING` for idempotency):
   - opportunity_id, close_lead_id, pipeline_lead_id, signal_id
   - signal_type, campaign_id, deal_value, outcome (won/lost)
   - touches_count: `SELECT COUNT(*) FROM touchpoints WHERE lead_email = ?`
   - days_to_close: opportunity.date_created → opportunity.date_updated
   - loss_reason (from Close opportunity note field, if lost)
5. Self-learning integration: **No direct function calls.** The existing batch optimizers (`signal-optimizer.ts`, `icp-learner.ts`) run during the daily auto-send cron. They will be updated to also query `revenue_attribution` when computing conversion rates, weighting revenue-attributed conversions higher than reply-only conversions. This is consistent with how the learning system already works (batch analysis, not per-event).

**New file:** `src/app/api/cron/revenue-check/route.ts`
- Cron: 8am ET daily
- Validates CRON_SECRET
- Calls `checkRevenueOutcomes()`

**New file:** `src/app/api/crm/attribution/route.ts`
- GET: Returns attribution data aggregated by signal_type, campaign, time period
- Query params: `?group_by=signal_type|campaign&days=30`
- Used by unified dashboard

**Enhanced files (learning system wiring):**
- `src/lib/learning/signal-optimizer.ts` — add query to `revenue_attribution` table: boost signal types that produced won deals, penalize those that produced losses
- `src/lib/learning/icp-learner.ts` — add query joining `revenue_attribution` → `pipeline_leads` to weight ICP dimensions by actual revenue

---

## Workstream C: Instantly Intelligence

### C1 — Sending Account Health Monitor

**Purpose:** Monitor deliverability across 50 sending accounts, alert on degradation.

**New file:** `src/lib/instantly-health.ts`

New Instantly client functions needed (add to `src/lib/instantly.ts`):

```typescript
// Uses existing MCP tool list_sending_accounts → GET /accounts
export async function listSendingAccounts(): Promise<Array<{ email: string; daily_limit: number }>>

// Uses existing MCP tool list_campaign_leads → POST /leads/list
// Already exists as internal function, just needs to be exported
```

Exports `checkAccountHealth()`:
1. Call `listSendingAccounts()` → get all account emails
2. For each account, query **Supabase** (not Instantly API) for metrics:
   - Bounce count: `SELECT COUNT(*) FROM email_outcomes WHERE from_email = ? AND outcome = 'hard_bounce' AND created_at > NOW() - INTERVAL '7 days'`
   - Reply count: `SELECT COUNT(*) FROM replies WHERE lead_email IN (SELECT lead_email FROM pipeline_leads WHERE ...) AND created_at > NOW() - INTERVAL '7 days'`
   - Send count: `SELECT COUNT(*) FROM pipeline_leads WHERE status = 'pushed' AND created_at > NOW() - INTERVAL '7 days'` (approximate)
3. Calculate per account:
   - Bounce rate: bounces / sends (decimal, 0.0 to 1.0)
   - Reply rate: replies / sends (decimal, 0.0 to 1.0)
   - Health score: `Math.max(0, Math.min(100, Math.round(100 - (bounce_rate * 200) + (reply_rate * 50))))`
4. Flag accounts with bounce_rate > 0.05 or health_score < 40
5. Upsert into `account_health_snapshots` (UNIQUE on account_email + snapshot_date handles idempotency)
6. If any flagged: Slack alert with account list and metrics

**New file:** `src/app/api/cron/account-health/route.ts`
- Cron: 7am ET daily
- Validates CRON_SECRET
- Calls `checkAccountHealth()`

**New file:** `src/app/api/instantly/health/route.ts`
- GET: Returns latest health snapshots for all accounts
- Query params: `?days=7` for historical view
- Used by unified dashboard

### C2 — Smart Campaign Rotation + A/B Testing

**Purpose:** Programmatically create campaign variants and split-test them, measuring through to revenue.

**New file:** `src/lib/instantly-experiments.ts`

Exports:
- `createExperiment(baseCampaignId, variantCount, variantInstructions)`:
  1. Fetch base campaign details via Instantly API
  2. Use Claude to generate variant email copy based on instructions
  3. Create new campaigns in Instantly with variant copy
  4. Store experiment in `ab_experiments`
  5. Return experiment_id

- `assignLeadToExperiment(experimentId, leadEmail)`:
  1. Determine variant (round-robin based on current lead counts)
  2. Add lead to the assigned variant's campaign via `addLeadsToCampaign()`
  3. Record in `ab_experiment_leads`

- `checkExperimentResults(experimentId)`:
  1. For each variant campaign: count leads, replies (from `replies` table), meetings (from `revenue_attribution`)
  2. Calculate conversion rates with confidence intervals
  3. If sample size sufficient (>100 leads per variant) and statistically significant:
     - Mark winner, pause loser campaigns
     - Move remaining leads to winner via `addLeadsToCampaign()` on winner
  4. Return results with summary

**New file:** `src/app/api/instantly/experiments/route.ts`
- POST: Create new experiment
- GET: List experiments with results
- PATCH: End experiment, graduate winner

**Integration with pipeline processor:** Note — both A2 and C2 need to modify `processor.ts`. To avoid merge conflicts, **a single agent handles all processor.ts changes** (assigned to A2 agent, which also adds the A/B routing call): when `getCampaignId()` returns a campaign that has an active experiment, route through `assignLeadToExperiment()` instead.

---

## Workstream D: Unified Dashboard

### D1 — Unified Analytics Page

**Purpose:** Single view combining Close pipeline + Instantly campaigns + attribution + account health.

**Note:** D1 can start in parallel with A-C. It only queries DB tables (created by migration) and calls API routes. It does not import code from other workstreams. API routes return empty arrays if no data exists yet.

**New file:** `src/app/api/dashboard/analytics/route.ts`

Aggregates from multiple sources:
1. **Pipeline funnel** — Close leads by status + conversion rates between stages
2. **Campaign metrics** — Per campaign: leads pushed (from pipeline_leads), replies (from replies table), meetings (from revenue_attribution), revenue
3. **Signal ROI** — Per signal type: leads, meetings, revenue, cost per meeting
4. **Account health** — Latest snapshots from account_health_snapshots
5. **A/B results** — Active experiments from ab_experiments
6. **Attribution chains** — Won deals with full signal → campaign → touches chain

**New file:** `src/app/dashboard/analytics/page.tsx`

Layout sections:
1. **Summary cards** — Total pipeline value, win rate, avg days to close, active experiments
2. **Funnel visualization** — Horizontal funnel: Cold Outreach → Interested → Meeting → Proposal → Won (with conversion % between each)
3. **Campaign table** — Sortable by sends, replies, meetings, revenue, ROI
4. **Signal ROI chart** — Bar chart of revenue per signal type
5. **Account health grid** — Color-coded grid of 50 accounts (green/yellow/red)
6. **A/B experiments** — Active tests with running metrics
7. **Recent wins** — Last 10 closed-won with attribution chain

**Enhanced file:** `src/app/dashboard/layout.tsx`
- Add "Analytics" nav item between "Insights" and "CRM"

---

## Database Migration: `migration-v8-advancement.sql`

```sql
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
-- Note: UNIQUE on close_lead_id already creates an implicit index; no separate index needed

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

-- Account health snapshots
-- Rates stored as decimals: 0.05 = 5% bounce rate
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

---

## Cron Schedule (full, after additions)

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/pipeline/ingest` | 12pm ET weekdays | Signal ingest |
| `/api/pipeline/check` | 1pm ET weekdays | ICP validation |
| `/api/cron/auto-send` | 2pm ET weekdays | Auto-send + sequences |
| `/api/cron/verify` | Every 6 hours | Email verification |
| `/api/tam/discover` | 11am ET Mondays | TAM discovery |
| `/api/cron/sync-close` | Every 30 min | **NEW** Close → Instantly reverse sync |
| `/api/cron/revenue-check` | 8am ET daily | **NEW** Won/lost attribution |
| `/api/cron/account-health` | 7am ET daily | **NEW** Sending account health |

---

## New Environment Variable

| Variable | Purpose |
|----------|---------|
| `CAMPAIGN_ID_NURTURE` | Instantly campaign ID for nurture/re-engagement sequences |

---

## File Inventory

**New files (13):**
1. `src/lib/crm/reverse-sync.ts`
2. `src/app/api/cron/sync-close/route.ts`
3. `src/lib/crm/revenue-attribution.ts`
4. `src/app/api/cron/revenue-check/route.ts`
5. `src/app/api/crm/attribution/route.ts`
6. `src/lib/instantly-health.ts`
7. `src/app/api/cron/account-health/route.ts`
8. `src/app/api/instantly/health/route.ts`
9. `src/lib/instantly-experiments.ts`
10. `src/app/api/instantly/experiments/route.ts`
11. `src/app/api/dashboard/analytics/route.ts`
12. `src/app/dashboard/analytics/page.tsx`
13. `src/lib/supabase/migration-v8-advancement.sql`

**Enhanced files (8):**
1. `src/lib/crm/close-sync.ts` — add `logActivityToClose()`
2. `src/lib/crm/close-client.ts` — add `logEmail()`, `logCall()` wrappers
3. `src/lib/instantly.ts` — export `listSendingAccounts()`
4. `src/app/api/webhooks/calendly/route.ts` — richer opportunity creation
5. `src/app/api/webhooks/instantly/bounce/route.ts` — cross-system blocklist
6. `src/app/api/replies/[id]/book/route.ts` — enriched manual booking
7. `src/lib/pipeline/processor.ts` — activity logging + A/B routing (single agent handles both)
8. `src/app/dashboard/layout.tsx` — add Analytics nav item
9. `vercel.json` — add 3 new crons
10. `src/lib/learning/signal-optimizer.ts` — add revenue_attribution queries
11. `src/lib/learning/icp-learner.ts` — add revenue_attribution queries

---

## Parallel Build Strategy

```
Migration runs first (shared dependency)
        │
        ├── Workstream A: Sync Layer (2 agents)
        │     ├── Agent A1: reverse-sync.ts + cron + close-client wrappers
        │     └── Agent A2: close-sync.ts enhancements + activity logging
        │               + bounce webhook blocklist (A3 merged here)
        │               + processor.ts changes (activity logging + A/B routing)
        │
        ├── Workstream B: Pipeline Automation (2 agents)
        │     ├── Agent B1: Calendly webhook + book route enhancements
        │     └── Agent B2: revenue-attribution.ts + cron + API
        │               + signal-optimizer.ts + icp-learner.ts wiring
        │
        ├── Workstream C: Instantly Intelligence (2 agents)
        │     ├── Agent C1: instantly-health.ts + cron + API + instantly.ts export
        │     └── Agent C2: instantly-experiments.ts + API route
        │
        └── Workstream D: Unified Dashboard (1 agent, starts in parallel)
              └── Agent D1: analytics API + dashboard page + nav update + vercel.json crons
```

**Key serialization:** Agent A2 owns all `processor.ts` changes (both activity logging from A2 and A/B routing from C2's design). Agent C2 builds the experiment logic; A2 wires it into the processor.
