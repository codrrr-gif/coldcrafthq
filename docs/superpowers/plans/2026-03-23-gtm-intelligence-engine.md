# GTM Intelligence Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully automated signal-based lead generation pipeline that monitors buying signals (funding, job changes, hiring), finds and verifies decision-maker emails, runs AI research, and pushes personalized leads into Instantly campaigns daily.

**Architecture:** Apify actors scrape signal sources daily (cron-triggered); a client-driven processor enriches each signal by finding the decision maker, discovering their email via pattern permutation + SMTP, running signal-aware AI research via Perplexity + Claude, and pushing verified leads to the right Instantly campaign. The email finder populates a `domain_patterns` cache from every verified email in the system, compounding accuracy over time.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (Postgres), Apify API, Reacher SMTP VPS, Perplexity sonar-pro, Claude Sonnet 4.6, Instantly API v2, Vercel (Hobby — daily cron only).

---

## Parallelization Map

```
BATCH 1 (all parallel — no dependencies):
  Task 1: DB Migration + All Types
  Task 2: Apify Client
  Task 3: ICP Filter + Signal Scorer (pure functions)

BATCH 2 (parallel — after Tasks 1 + 2):
  Task 4: Email Finder (needs domain_patterns table)
  Task 5: Signal Processors (needs raw_signals table + Apify client)

BATCH 3 (parallel — after Tasks 4 + 5):
  Task 6: Enrichment Engine (contact finder + research agent)
  Task 7: Pipeline Orchestrator + API Routes

BATCH 4 (after Task 7):
  Task 8: Dashboard UI + Nav
  Task 9: Cron config + Env vars + Deploy
```

---

## File Map

### New Files — Foundation
| File | Responsibility |
|------|---------------|
| `src/lib/supabase/migration-v5-gtm.sql` | 4 new tables: domain_patterns, signal_sources, raw_signals, pipeline_leads |
| `src/lib/gtm/types.ts` | All TypeScript types for the GTM system |
| `src/lib/apify.ts` | Apify REST API client: run actor, poll status, fetch dataset items |

### New Files — Email Finder
| File | Responsibility |
|------|---------------|
| `src/lib/finder/permutations.ts` | Generate 10 email patterns from first + last + domain |
| `src/lib/finder/patterns.ts` | domain_patterns CRUD: seed from verification_results, update on find |
| `src/lib/finder/index.ts` | Finder orchestrator: cache hit → SMTP permutation → external fallback |
| `src/app/api/finder/find/route.ts` | POST — single find (name + domain → verified email) |
| `src/app/api/finder/bulk/route.ts` | POST — CSV enrichment (name columns → adds email column) |

### New Files — Signal System
| File | Responsibility |
|------|---------------|
| `src/lib/signals/types.ts` | RawSignal type, SignalType enum, signal source configs |
| `src/lib/signals/icp-filter.ts` | ICP qualification: title matching, company size, geography, industry exclusions |
| `src/lib/signals/scorer.ts` | Score signal 0–100 based on type, recency, company fit |
| `src/lib/signals/deduplicator.ts` | Prevent reprocessing same company+signal_type within 30 days |
| `src/lib/signals/utils.ts` | Shared: extract domain from text, extract date from Apify item |
| `src/lib/signals/funding.ts` | Parse Apify Google News results for funding signals |
| `src/lib/signals/job-postings.ts` | Parse Apify LinkedIn Jobs results for hiring signals |
| `src/lib/signals/leadership.ts` | Parse Apify Google News results for leadership change signals |
| `src/app/api/pipeline/ingest/route.ts` | POST — start Apify actor runs (called by cron) |
| `src/app/api/pipeline/check/route.ts` | POST — poll actor status, ingest completed datasets |

### New Files — Enrichment
| File | Responsibility |
|------|---------------|
| `src/lib/enrichment/contact-finder.ts` | Find decision maker at company via web search (Google → LinkedIn) |
| `src/lib/enrichment/research-agent.ts` | Signal-aware Perplexity + Claude: company intel + signal context + contact profile + personalized opener |
| `src/lib/enrichment/campaign-mapper.ts` | Map signal_type → Instantly campaign_id (reads env vars) |
| `src/lib/pipeline/processor.ts` | Per-lead orchestrator: contact → email → verify → research → push |
| `src/app/api/pipeline/process/route.ts` | POST — process next batch of pending pipeline_leads (client-driven) |
| `src/app/api/pipeline/leads/route.ts` | GET — paginated pipeline_leads for dashboard |

### New Files — Dashboard
| File | Responsibility |
|------|---------------|
| `src/app/dashboard/pipeline/page.tsx` | Live pipeline view: signal stats, lead table, status tracking, manual trigger |

### Modified Files
| File | Change |
|------|--------|
| `src/app/dashboard/layout.tsx` | Add "Pipeline" nav item |
| `vercel.json` | Add daily pipeline ingest cron |
| `.env.example` | Add APIFY_API_KEY, campaign mapping vars |
| `src/app/api/cron/auto-send/route.ts` | Piggyback pipeline ingest (fire-and-forget) — Hobby plan has one cron slot |

---

## Task 1: Database Migration + All Types

**Files:**
- Create: `src/lib/supabase/migration-v5-gtm.sql`
- Create: `src/lib/gtm/types.ts`

- [ ] **Step 1: Write the SQL migration**

```sql
-- migration-v5-gtm.sql
-- ============================================
-- GTM Intelligence Engine Tables
-- ============================================

-- Ensure updated_at trigger function exists (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Email finder: cache the winning pattern per domain
CREATE TABLE IF NOT EXISTS domain_patterns (
  domain TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,
  -- Patterns: 'first.last' | 'firstlast' | 'flast' | 'f.last' | 'first' | 'last.first' | 'lastfirst' | 'first_last'
  confidence INTEGER DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  sample_count INTEGER DEFAULT 0,
  last_verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signal source configuration (seeded below)
CREATE TABLE IF NOT EXISTS signal_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  apify_actor_id TEXT NOT NULL,
  search_queries TEXT[] NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  run_frequency TEXT DEFAULT 'daily',
  last_run_at TIMESTAMPTZ,
  last_run_id TEXT,
  last_signal_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw signals before enrichment
CREATE TABLE IF NOT EXISTS raw_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('funding', 'job_posting', 'leadership_change', 'news')),
  company_name TEXT,
  company_domain TEXT,
  headline TEXT,
  signal_url TEXT,
  signal_date DATE,
  score INTEGER DEFAULT 50 CHECK (score BETWEEN 0 AND 100),
  raw_data JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  filtered_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_signals_processed ON raw_signals(processed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_signals_company ON raw_signals(company_domain, signal_type);
-- Deduplication: same company + same signal type + same date = skip
CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_signals_dedup
  ON raw_signals(company_domain, signal_type, signal_date)
  WHERE company_domain IS NOT NULL;

-- Enriched pipeline leads
CREATE TABLE IF NOT EXISTS pipeline_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES raw_signals(id) ON DELETE SET NULL,

  -- Company
  company_name TEXT,
  company_domain TEXT NOT NULL,
  company_size TEXT,
  company_industry TEXT,
  company_location TEXT,
  company_funding_stage TEXT,

  -- Contact
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  linkedin_url TEXT,

  -- Email
  email TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verdict TEXT,
  email_score INTEGER,
  email_found_via TEXT, -- 'pattern_cache' | 'smtp_permutation' | 'external'

  -- Signal context
  signal_type TEXT,
  signal_summary TEXT,
  signal_date DATE,
  signal_score INTEGER,

  -- AI Research
  research_summary TEXT,
  pain_points TEXT[],
  opportunity_signals TEXT[],
  personalized_opener TEXT,
  research_data JSONB,

  -- Campaign
  instantly_campaign_id TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'finding_contact', 'finding_email',
    'verifying', 'researching', 'ready', 'pushed', 'failed', 'filtered'
  )),
  failure_reason TEXT,
  pushed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_status ON pipeline_leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_domain ON pipeline_leads(company_domain);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_email ON pipeline_leads(email) WHERE email IS NOT NULL;

-- Trigger: updated_at on pipeline_leads
CREATE OR REPLACE TRIGGER set_pipeline_leads_updated_at
  BEFORE UPDATE ON pipeline_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed signal sources
INSERT INTO signal_sources (name, apify_actor_id, search_queries) VALUES
(
  'google_news_funding',
  'apify/google-search-scraper',
  ARRAY[
    'startup raised million series funding 2025 SaaS B2B',
    'company closes seed series A B funding round 2025',
    '"raised" "million" "funding" site:techcrunch.com 2025',
    '"series A" OR "series B" "raised" SaaS software 2025'
  ]
),
(
  'linkedin_jobs_sales',
  'bebity/linkedin-jobs-scraper',
  ARRAY[
    'Head of Sales',
    'VP of Sales',
    'VP Sales',
    'Director of Sales',
    'Revenue Operations',
    'Sales Development Representative',
    'Head of Growth',
    'Growth Marketing Manager',
    'Chief Revenue Officer'
  ]
),
(
  'google_news_leadership',
  'apify/google-search-scraper',
  ARRAY[
    'appoints hires VP Sales Chief Revenue Officer 2025 startup',
    '"new VP" OR "new head of" sales marketing growth 2025 SaaS',
    '"joins as" VP Director Head sales marketing revenue 2025'
  ]
)
ON CONFLICT (name) DO NOTHING;
```

- [ ] **Step 2: Write all GTM types**

```typescript
// src/lib/gtm/types.ts

export type SignalType = 'funding' | 'job_posting' | 'leadership_change' | 'news';

export type PipelineStatus =
  | 'pending'
  | 'finding_contact'
  | 'finding_email'
  | 'verifying'
  | 'researching'
  | 'ready'
  | 'pushed'
  | 'failed'
  | 'filtered';

export type EmailFoundVia = 'pattern_cache' | 'smtp_permutation' | 'external';

export interface DomainPattern {
  domain: string;
  pattern: string;
  confidence: number;
  sample_count: number;
  last_verified_at: string | null;
  updated_at: string;
}

export interface SignalSource {
  id: string;
  name: string;
  apify_actor_id: string;
  search_queries: string[];
  enabled: boolean;
  run_frequency: string;
  last_run_at: string | null;
  last_run_id: string | null;
  last_signal_count: number;
  created_at: string;
}

export interface RawSignal {
  id: string;
  source_name: string;
  signal_type: SignalType;
  company_name: string | null;
  company_domain: string | null;
  headline: string | null;
  signal_url: string | null;
  signal_date: string | null;
  score: number;
  raw_data: Record<string, unknown>;
  processed: boolean;
  filtered_reason: string | null;
  created_at: string;
}

export interface PipelineLead {
  id: string;
  signal_id: string | null;
  company_name: string | null;
  company_domain: string;
  company_size: string | null;
  company_industry: string | null;
  company_location: string | null;
  company_funding_stage: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  linkedin_url: string | null;
  email: string | null;
  email_verified: boolean;
  email_verdict: string | null;
  email_score: number | null;
  email_found_via: EmailFoundVia | null;
  signal_type: SignalType | null;
  signal_summary: string | null;
  signal_date: string | null;
  signal_score: number | null;
  research_summary: string | null;
  pain_points: string[] | null;
  opportunity_signals: string[] | null;
  personalized_opener: string | null;
  research_data: Record<string, unknown> | null;
  instantly_campaign_id: string | null;
  status: PipelineStatus;
  failure_reason: string | null;
  pushed_at: string | null;
  created_at: string;
  updated_at: string;
}

// For the email finder
export interface FinderResult {
  email: string | null;
  found: boolean;
  pattern: string | null;
  found_via: EmailFoundVia | null;
  verdict: string | null;
  score: number | null;
  tried_patterns: string[];
}

// For the research agent
export interface ResearchResult {
  company_overview: string;
  pain_signals: string[];
  opportunity_signals: string[];
  personalized_opener: string;
  research_summary: string;
  contact_profile: string;
  raw_research: Record<string, string>;
}

// For signal processing
export interface ParsedSignal {
  signal_type: SignalType;
  company_name: string;
  company_domain: string | null;
  headline: string;
  signal_url: string;
  signal_date: string; // ISO date string
  raw_data: Record<string, unknown>;
}

// Apify types
export interface ApifyRunResult {
  id: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTED';
  defaultDatasetId: string;
  startedAt: string;
  finishedAt: string | null;
}

export interface ApifyDatasetItem {
  url?: string;
  title?: string;
  description?: string;
  date?: string;
  [key: string]: unknown;
}
```

- [ ] **Step 3: Run the SQL migration in Supabase**

Open Supabase → SQL Editor → paste and run `migration-v5-gtm.sql`.
Expected: 4 tables created, 3 signal_sources rows inserted. Verify with: `SELECT name FROM signal_sources;`

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/migration-v5-gtm.sql src/lib/gtm/types.ts
git commit -m "feat: add GTM intelligence engine schema and types"
```

---

## Task 2: Apify Client

**Files:**
- Create: `src/lib/apify.ts`

- [ ] **Step 1: Write the Apify client**

```typescript
// src/lib/apify.ts
// ============================================
// Apify API Client
// ============================================

import type { ApifyRunResult, ApifyDatasetItem } from '@/lib/gtm/types';

const APIFY_BASE = 'https://api.apify.com/v2';

function getApiKey(): string {
  const key = process.env.APIFY_API_KEY;
  if (!key) throw new Error('APIFY_API_KEY not set');
  return key;
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
  };
}

// Start an actor run with given input
export async function runActor(
  actorId: string,
  input: Record<string, unknown>,
): Promise<{ runId: string; datasetId: string }> {
  const res = await fetch(`${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify runActor failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    runId: data.data.id,
    datasetId: data.data.defaultDatasetId,
  };
}

// Get run status
export async function getRunStatus(runId: string): Promise<ApifyRunResult> {
  const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify getRunStatus failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.data as ApifyRunResult;
}

// Fetch all items from a dataset (max 1000 per call, paginate)
export async function getDatasetItems(
  datasetId: string,
  limit = 200,
): Promise<ApifyDatasetItem[]> {
  const url = `${APIFY_BASE}/datasets/${datasetId}/items?limit=${limit}&clean=true`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify getDatasetItems failed: ${res.status} ${text}`);
  }

  return res.json();
}

// Run actor for Google Search Scraper (specific input format)
export async function runGoogleSearch(
  queries: string[],
  resultsPerQuery = 10,
): Promise<{ runId: string; datasetId: string }> {
  return runActor('apify/google-search-scraper', {
    queries: queries.join('\n'),
    maxPagesPerQuery: 1,
    resultsPerPage: resultsPerQuery,
    mobileResults: false,
    languageCode: 'en',
    countryCode: 'US',
    includeUnfilteredResults: false,
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  });
}

// Run actor for LinkedIn Jobs Scraper
export async function runLinkedInJobsSearch(
  keywords: string[],
  location = 'United States',
  limit = 50,
): Promise<{ runId: string; datasetId: string }> {
  return runActor('bebity/linkedin-jobs-scraper', {
    title: keywords.join(' OR '),
    location,
    rows: limit,
    publishedAt: 'r86400', // last 24 hours
  });
}
```

- [ ] **Step 2: Add APIFY_API_KEY to .env.example and Vercel**

In `.env.example`, add:
```
APIFY_API_KEY=your_apify_api_key_here
```

Add the actual key to Vercel: `vercel env add APIFY_API_KEY production`

- [ ] **Step 3: Commit**

```bash
git add src/lib/apify.ts .env.example
git commit -m "feat: add Apify API client"
```

---

## Task 3: ICP Filter + Signal Scorer

**Files:**
- Create: `src/lib/signals/types.ts`
- Create: `src/lib/signals/icp-filter.ts`
- Create: `src/lib/signals/scorer.ts`

These are pure functions — no DB, no network calls.

- [ ] **Step 1: Write signal types + ICP config**

```typescript
// src/lib/signals/types.ts
import type { SignalType, ParsedSignal } from '@/lib/gtm/types';

export const SIGNAL_SCORES: Record<SignalType, number> = {
  funding: 100,
  leadership_change: 90,
  job_posting: 70,
  news: 50,
};

// ICP config from env vars with sensible defaults
export function getIcpConfig() {
  return {
    targetTitles: (
      process.env.ICP_TARGET_TITLES ||
      'CEO,Founder,Co-Founder,VP Sales,VP of Sales,Head of Sales,Chief Revenue Officer,CRO,VP Marketing,CMO,Head of Growth,Director of Sales,Head of Business Development,VP Business Development'
    ).split(',').map((t) => t.trim().toLowerCase()),

    excludeIndustries: (
      process.env.ICP_EXCLUDE_INDUSTRIES ||
      'government,non-profit,nonprofit,education,hospital,healthcare,military'
    ).split(',').map((i) => i.trim().toLowerCase()),

    targetGeographies: (
      process.env.ICP_GEOGRAPHIES ||
      'US,USA,United States,UK,United Kingdom,Canada,Australia,CA,AU,GB'
    ).split(',').map((g) => g.trim()),

    minFundingAmountM: parseFloat(process.env.ICP_MIN_FUNDING_M || '0.5'), // $500k minimum
    maxFundingAmountM: parseFloat(process.env.ICP_MAX_FUNDING_M || '100'), // $100M max (beyond = enterprise)
  };
}
```

- [ ] **Step 2: Write ICP filter**

```typescript
// src/lib/signals/icp-filter.ts
import { getIcpConfig } from './types';
import type { ParsedSignal } from '@/lib/gtm/types';

export interface IcpResult {
  passes: boolean;
  reason?: string;
}

// Check if a parsed signal passes ICP filters
export function filterSignalByIcp(signal: ParsedSignal): IcpResult {
  const config = getIcpConfig();

  // Must have a domain to be actionable
  if (!signal.company_domain) {
    return { passes: false, reason: 'no_domain' };
  }

  // Exclude known non-ICP domains
  const excluded = ['gov', 'edu', 'mil', 'ac.uk', 'org'];
  if (excluded.some((tld) => signal.company_domain!.endsWith(`.${tld}`))) {
    return { passes: false, reason: 'excluded_tld' };
  }

  return { passes: true };
}

// Check if a title matches ICP target titles
export function isTitleInIcp(title: string): boolean {
  const config = getIcpConfig();
  const normalized = title.toLowerCase();
  return config.targetTitles.some((t) => normalized.includes(t));
}

// Check if a location matches target geographies
export function isLocationInIcp(location: string): boolean {
  const config = getIcpConfig();
  return config.targetGeographies.some((g) =>
    location.toLowerCase().includes(g.toLowerCase())
  );
}
```

- [ ] **Step 3: Write signal scorer**

```typescript
// src/lib/signals/scorer.ts
import { SIGNAL_SCORES } from './types';
import type { SignalType } from '@/lib/gtm/types';

// Score a signal 0-100 based on type, recency, and headline signals
export function scoreSignal(
  signalType: SignalType,
  signalDate: string | null,
  headline: string,
): number {
  let score = SIGNAL_SCORES[signalType];

  // Recency decay: full score within 7 days, -10 per week after
  if (signalDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(signalDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince > 7) score = Math.max(score - Math.floor((daysSince - 7) / 7) * 10, 30);
  }

  // Headline boosters
  const h = headline.toLowerCase();
  if (h.includes('series a') || h.includes('series b')) score = Math.min(score + 10, 100);
  if (h.includes('million') || h.includes('raises')) score = Math.min(score + 5, 100);
  if (h.includes('vp sales') || h.includes('chief revenue')) score = Math.min(score + 10, 100);
  if (h.includes('head of growth') || h.includes('vp marketing')) score = Math.min(score + 8, 100);

  // Headline penalties
  if (h.includes('acquisition') || h.includes('acquired')) score = Math.max(score - 20, 10); // acquirers don't need new tools
  if (h.includes('layoff') || h.includes('cuts') || h.includes('shutdown')) score = Math.max(score - 30, 10);

  return score;
}

// Minimum score to create a pipeline lead (below = filtered)
export const MIN_SIGNAL_SCORE = parseInt(process.env.MIN_SIGNAL_SCORE || '55');
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/signals/types.ts src/lib/signals/icp-filter.ts src/lib/signals/scorer.ts
git commit -m "feat: add ICP filter and signal scorer"
```

---

## Task 4: Email Finder

**Files:**
- Create: `src/lib/finder/permutations.ts`
- Create: `src/lib/finder/patterns.ts`
- Create: `src/lib/finder/index.ts`
- Create: `src/app/api/finder/find/route.ts`
- Create: `src/app/api/finder/bulk/route.ts`
- Modify: `src/app/api/cron/auto-send/route.ts` (piggyback pipeline ingest)

**Depends on:** Task 1 (domain_patterns table)

- [ ] **Step 1: Write permutation generator**

```typescript
// src/lib/finder/permutations.ts
// ============================================
// Generates the 10 most common B2B email patterns
// for a given first name, last name, and domain.
// Order = probability-weighted (most common first).
// ============================================

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

export function generatePermutations(
  firstName: string,
  lastName: string,
  domain: string,
): string[] {
  const f = normalize(firstName);
  const l = normalize(lastName);
  if (!f || !l || !domain) return [];

  const fi = f[0]; // first initial

  // Ordered by prevalence in B2B
  return [
    `${f}.${l}@${domain}`,   // john.smith — most common (~40%)
    `${f}${l}@${domain}`,    // johnsmith (~15%)
    `${fi}${l}@${domain}`,   // jsmith (~13%)
    `${fi}.${l}@${domain}`,  // j.smith (~10%)
    `${f}@${domain}`,        // john (~7%)
    `${l}.${f}@${domain}`,   // smith.john (~5%)
    `${l}${f}@${domain}`,    // smithjohn (~3%)
    `${l}@${domain}`,        // smith (~3%)
    `${f}_${l}@${domain}`,   // john_smith (~2%)
    `${f}.${l[0]}@${domain}`,// john.s (~2%)
  ];
}

// Given a known email, extract which pattern it matches
export function detectPattern(email: string, firstName: string, lastName: string): string | null {
  const f = normalize(firstName);
  const l = normalize(lastName);
  const fi = f[0];
  const local = email.split('@')[0].toLowerCase();

  if (local === `${f}.${l}`) return 'first.last';
  if (local === `${f}${l}`) return 'firstlast';
  if (local === `${fi}${l}`) return 'flast';
  if (local === `${fi}.${l}`) return 'f.last';
  if (local === f) return 'first';
  if (local === `${l}.${f}`) return 'last.first';
  if (local === `${l}${f}`) return 'lastfirst';
  if (local === l) return 'last';
  if (local === `${f}_${l}`) return 'first_last';
  if (local === `${f}.${l[0]}`) return 'first.li';
  return null;
}

// Apply a named pattern to generate an email
export function applyPattern(
  pattern: string,
  firstName: string,
  lastName: string,
  domain: string,
): string | null {
  const f = normalize(firstName);
  const l = normalize(lastName);
  if (!f || !l) return null;
  const fi = f[0];

  const patternMap: Record<string, string> = {
    'first.last': `${f}.${l}@${domain}`,
    'firstlast': `${f}${l}@${domain}`,
    'flast': `${fi}${l}@${domain}`,
    'f.last': `${fi}.${l}@${domain}`,
    'first': `${f}@${domain}`,
    'last.first': `${l}.${f}@${domain}`,
    'lastfirst': `${l}${f}@${domain}`,
    'last': `${l}@${domain}`,
    'first_last': `${f}_${l}@${domain}`,
    'first.li': `${f}.${l[0]}@${domain}`,
  };

  return patternMap[pattern] ?? null;
}
```

- [ ] **Step 2: Write domain patterns cache**

```typescript
// src/lib/finder/patterns.ts
// ============================================
// domain_patterns table CRUD.
// Tracks the winning email pattern per domain.
// ============================================

import { supabase } from '@/lib/supabase/client';
import { detectPattern } from './permutations';

// Get cached pattern for a domain
export async function getCachedPattern(domain: string): Promise<{
  pattern: string;
  confidence: number;
} | null> {
  const { data } = await supabase
    .from('domain_patterns')
    .select('pattern, confidence')
    .eq('domain', domain)
    .single();

  if (!data || data.confidence < 60) return null; // Only use high-confidence patterns
  return { pattern: data.pattern, confidence: data.confidence };
}

// Record a successfully verified email — updates pattern confidence
export async function updateDomainPattern(
  email: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  const domain = email.split('@')[1];
  if (!domain || !firstName || !lastName) return;

  const pattern = detectPattern(email, firstName, lastName);
  if (!pattern) return;

  const { data: existing } = await supabase
    .from('domain_patterns')
    .select('pattern, confidence, sample_count')
    .eq('domain', domain)
    .single();

  if (!existing) {
    await supabase.from('domain_patterns').insert({
      domain,
      pattern,
      confidence: 70,
      sample_count: 1,
      last_verified_at: new Date().toISOString(),
    });
    return;
  }

  // Same pattern confirmed → increase confidence (cap at 98)
  // Different pattern → decrease confidence, update if sample count is small
  const samePattern = existing.pattern === pattern;
  const newSampleCount = existing.sample_count + 1;
  const newConfidence = samePattern
    ? Math.min(existing.confidence + Math.floor(10 / newSampleCount) + 2, 98)
    : Math.max(existing.confidence - 15, 20);
  const newPattern = samePattern ? existing.pattern : (newSampleCount <= 3 ? pattern : existing.pattern);

  await supabase.from('domain_patterns').update({
    pattern: newPattern,
    confidence: newConfidence,
    sample_count: newSampleCount,
    last_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('domain', domain);
}

// Seed domain_patterns from existing verification_results
// Call this once after deploy to populate cache from history
export async function seedPatternsFromHistory(): Promise<{ seeded: number }> {
  // Fetch valid emails that have names (needed to detect pattern)
  // NOTE: verification_results doesn't store names — we skip auto-seed
  // Patterns will build naturally as emails are found going forward.
  // This function is a no-op placeholder for future use.
  return { seeded: 0 };
}
```

- [ ] **Step 3: Write the finder orchestrator**

```typescript
// src/lib/finder/index.ts
// ============================================
// Email Finder — the core engine.
//
// Order of operations:
// 1. Check domain_patterns cache (instant if confidence >= 60)
// 2. SMTP permutation loop via Reacher
// 3. If catch-all detected: return most-probable pattern (unconfirmed)
// ============================================

import { generatePermutations, applyPattern } from './permutations';
import { getCachedPattern, updateDomainPattern } from './patterns';
import { verifyEmail } from '@/lib/verify/pipeline';
import type { FinderResult } from '@/lib/gtm/types';

export async function findEmail(
  firstName: string,
  lastName: string,
  domain: string,
): Promise<FinderResult> {
  const triedPatterns: string[] = [];

  // Step 1: Check pattern cache — skip external APIs for speed
  const cached = await getCachedPattern(domain);
  if (cached) {
    const candidateEmail = applyPattern(cached.pattern, firstName, lastName, domain);
    if (candidateEmail) {
      triedPatterns.push(candidateEmail);
      // Disable external APIs for finder calls — we do SMTP only here
      const result = await verifyEmail(candidateEmail, {
        use_million_verifier: false,
        use_findymail: false,
      });
      if (result.verdict === 'valid') {
        await updateDomainPattern(candidateEmail, firstName, lastName);
        return {
          email: candidateEmail,
          found: true,
          pattern: cached.pattern,
          found_via: 'pattern_cache',
          verdict: result.verdict,
          score: result.score,
          tried_patterns: triedPatterns,
        };
      }
    }
  }

  // Step 2: SMTP permutation loop
  const permutations = generatePermutations(firstName, lastName, domain);
  let isCatchAll = false;

  for (const candidate of permutations) {
    if (triedPatterns.includes(candidate)) continue;
    triedPatterns.push(candidate);

    const result = await verifyEmail(candidate, {
      use_million_verifier: false,
      use_findymail: false,
    });

    // Catch-all detected — SMTP can't distinguish individual mailboxes
    if (result.catch_all?.is_catch_all) {
      isCatchAll = true;
      break;
    }

    if (result.verdict === 'valid') {
      await updateDomainPattern(candidate, firstName, lastName);
      return {
        email: candidate,
        found: true,
        pattern: null,
        found_via: 'smtp_permutation',
        verdict: result.verdict,
        score: result.score,
        tried_patterns: triedPatterns,
      };
    }

    // Definitive rejection — mailbox confirmed absent
    if (result.verdict === 'invalid' && result.reason === 'mailbox_not_found') {
      continue;
    }
  }

  // Step 3: Catch-all domain — return most probable pattern unconfirmed
  if (isCatchAll) {
    const mostProbable = permutations[0];
    return {
      email: mostProbable,
      found: false,
      pattern: null,
      found_via: null,
      verdict: 'unknown',
      score: null,
      tried_patterns: triedPatterns,
    };
  }

  return {
    email: null,
    found: false,
    pattern: null,
    found_via: null,
    verdict: null,
    score: null,
    tried_patterns: triedPatterns,
  };
}
```

- [ ] **Step 4: Write the find API route**

```typescript
// src/app/api/finder/find/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { findEmail } from '@/lib/finder';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { first_name, last_name, domain } = await req.json();

    if (!first_name || !last_name || !domain) {
      return NextResponse.json(
        { error: 'first_name, last_name, and domain are required' },
        { status: 400 }
      );
    }

    const result = await findEmail(first_name, last_name, domain);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Finder error:', err);
    return NextResponse.json({ error: 'Find failed' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Write the bulk enrichment route**

```typescript
// src/app/api/finder/bulk/route.ts
// Accepts CSV with columns: first_name, last_name, domain (or company_domain)
// Returns CSV with added `email` column + `email_found` + `email_verdict`

import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { findEmail } from '@/lib/finder';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min for bulk

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const text = await file.text();
    const { data: rows, errors } = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length && !rows.length) {
      return NextResponse.json({ error: 'Failed to parse CSV' }, { status: 400 });
    }

    const BATCH_SIZE = 20; // process in batches to avoid timeout
    const results: Record<string, string>[] = [];

    for (let i = 0; i < Math.min(rows.length, 100); i++) {
      const row = rows[i];
      const firstName = row.first_name || row.firstName || row['First Name'] || '';
      const lastName = row.last_name || row.lastName || row['Last Name'] || '';
      const domain = row.domain || row.company_domain || row['Company Domain'] || '';

      if (!firstName || !lastName || !domain) {
        results.push({ ...row, email: '', email_found: 'false', email_verdict: 'missing_fields' });
        continue;
      }

      const found = await findEmail(firstName, lastName, domain);
      results.push({
        ...row,
        email: found.email || '',
        email_found: String(found.found),
        email_verdict: found.verdict || '',
        email_score: String(found.score || ''),
        email_found_via: found.found_via || '',
      });
    }

    const csv = Papa.unparse(results);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="enriched-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    console.error('Bulk finder error:', err);
    return NextResponse.json({ error: 'Bulk find failed' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/finder/ src/app/api/finder/
git commit -m "feat: add email finder with pattern cache and SMTP permutation"
```

---

## Task 5: Signal Processors + Ingestion

**Files:**
- Create: `src/lib/signals/deduplicator.ts`
- Create: `src/lib/signals/funding.ts`
- Create: `src/lib/signals/job-postings.ts`
- Create: `src/lib/signals/leadership.ts`
- Create: `src/app/api/pipeline/ingest/route.ts`
- Create: `src/app/api/pipeline/check/route.ts`

**Depends on:** Task 1 (raw_signals table), Task 2 (Apify client)

- [ ] **Step 1: Write the deduplicator**

```typescript
// src/lib/signals/deduplicator.ts
import { supabase } from '@/lib/supabase/client';

// Returns true if this signal already exists (skip it)
export async function isDuplicate(
  companyDomain: string,
  signalType: string,
  signalDate: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('raw_signals')
    .select('id')
    .eq('company_domain', companyDomain)
    .eq('signal_type', signalType)
    .eq('signal_date', signalDate)
    .limit(1)
    .single();
  return !!data;
}

// Check if we've processed this domain for this signal type recently (30-day window)
export async function hasRecentSignal(
  companyDomain: string,
  signalType: string,
  withinDays = 30,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('raw_signals')
    .select('id')
    .eq('company_domain', companyDomain)
    .eq('signal_type', signalType)
    .gte('created_at', cutoff)
    .limit(1)
    .single();
  return !!data;
}
```

- [ ] **Step 2: Write the funding signal parser**

```typescript
// src/lib/signals/funding.ts
// Parses Google Search Scraper results for funding signals.

import type { ApifyDatasetItem, ParsedSignal } from '@/lib/gtm/types';
import { extractDomainFromText } from './utils';

const FUNDING_KEYWORDS = ['raised', 'funding', 'series a', 'series b', 'seed round', 'million', 'investment'];
const EXCLUDE_KEYWORDS = ['acquisition', 'acquired', 'merger', 'layoff', 'shutdown', 'bankrupt'];

export function parseFundingSignals(items: ApifyDatasetItem[]): ParsedSignal[] {
  const signals: ParsedSignal[] = [];

  for (const item of items) {
    const title = String(item.title || '').toLowerCase();
    const desc = String(item.description || '').toLowerCase();
    const combined = `${title} ${desc}`;

    // Must have funding keywords
    if (!FUNDING_KEYWORDS.some((k) => combined.includes(k))) continue;
    // Must not have exclusion keywords
    if (EXCLUDE_KEYWORDS.some((k) => combined.includes(k))) continue;

    const companyName = extractCompanyFromFundingHeadline(String(item.title || ''));
    const domain = extractDomainFromText(String(item.url || '') + ' ' + String(item.description || ''));

    if (!companyName) continue;

    signals.push({
      signal_type: 'funding',
      company_name: companyName,
      company_domain: domain,
      headline: String(item.title || ''),
      signal_url: String(item.url || ''),
      signal_date: extractDateFromItem(item) || new Date().toISOString().split('T')[0],
      raw_data: item as Record<string, unknown>,
    });
  }

  return signals;
}

function extractCompanyFromFundingHeadline(headline: string): string | null {
  // Patterns: "Acme Corp Raises $10M Series A", "Acme lands $5M seed", etc.
  const patterns = [
    /^([A-Z][A-Za-z0-9\s\.]+?)\s+(?:raises?|lands?|closes?|secures?|announces?)\s+\$/i,
    /^([A-Z][A-Za-z0-9\s\.]+?)\s+(?:gets?|receives?)\s+\$[\d\.]+[MmBb]/i,
  ];

  for (const pattern of patterns) {
    const match = headline.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractDateFromItem(item: ApifyDatasetItem): string | null {
  const raw = item.date || item.publishedAt || item.datePublished;
  if (!raw) return null;
  try {
    return new Date(String(raw)).toISOString().split('T')[0];
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Write utils for signal parsing**

```typescript
// src/lib/signals/utils.ts
// Shared utilities for signal parsers

// Extract a company domain from free text (looks for .com, .io, .co patterns)
export function extractDomainFromText(text: string): string | null {
  const domainPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g;
  const matches = text.match(domainPattern);
  if (!matches) return null;

  // Filter out known news/social sites
  const excluded = ['techcrunch.com', 'crunchbase.com', 'linkedin.com', 'twitter.com',
    'forbes.com', 'businesswire.com', 'prnewswire.com', 'google.com', 'bloomberg.com'];

  for (const match of matches) {
    const domain = match.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase();
    if (!excluded.includes(domain) && domain.includes('.')) return domain;
  }
  return null;
}
```

- [ ] **Step 4: Write the job postings parser**

```typescript
// src/lib/signals/job-postings.ts
// Parses LinkedIn Jobs Scraper results.

import type { ApifyDatasetItem, ParsedSignal } from '@/lib/gtm/types';
import { extractDomainFromText } from './utils';

const HIGH_VALUE_TITLES = [
  'vp sales', 'vp of sales', 'head of sales', 'chief revenue',
  'vp marketing', 'head of growth', 'head of marketing', 'cmo',
  'revenue operations', 'sales operations', 'director of sales',
  'business development', 'vp business development',
];

export function parseJobPostingSignals(items: ApifyDatasetItem[]): ParsedSignal[] {
  const signals: ParsedSignal[] = [];

  for (const item of items) {
    const title = String(item.title || item.jobTitle || '').toLowerCase();
    const company = String(item.company || item.companyName || '');
    const location = String(item.location || '');
    const url = String(item.url || item.jobUrl || '');

    if (!company || !HIGH_VALUE_TITLES.some((t) => title.includes(t))) continue;

    const domain = extractDomainFromText(url) ||
      extractDomainFromText(String(item.companyUrl || ''));

    signals.push({
      signal_type: 'job_posting',
      company_name: company,
      company_domain: domain,
      headline: `${company} is hiring: ${String(item.title || item.jobTitle || '')}`,
      signal_url: url,
      signal_date: new Date().toISOString().split('T')[0], // job postings = today
      raw_data: { ...item as Record<string, unknown>, location },
    });
  }

  return signals;
}
```

- [ ] **Step 5: Write the leadership change parser**

```typescript
// src/lib/signals/leadership.ts
// Parses Google News results for leadership change signals.

import type { ApifyDatasetItem, ParsedSignal } from '@/lib/gtm/types';
import { extractDomainFromText } from './utils';

const LEADERSHIP_KEYWORDS = [
  'appoints', 'hires', 'joins as', 'named', 'promoted to', 'welcomes',
  'new vp', 'new head of', 'new chief', 'new cro', 'new cmo',
];

const TARGET_ROLES = [
  'vp sales', 'vp of sales', 'chief revenue', 'cro', 'head of sales',
  'vp marketing', 'cmo', 'head of growth', 'vp business development',
  'director of sales', 'head of revenue',
];

export function parseLeadershipSignals(items: ApifyDatasetItem[]): ParsedSignal[] {
  const signals: ParsedSignal[] = [];

  for (const item of items) {
    const title = String(item.title || '').toLowerCase();
    const desc = String(item.description || '').toLowerCase();
    const combined = `${title} ${desc}`;

    if (!LEADERSHIP_KEYWORDS.some((k) => combined.includes(k))) continue;
    if (!TARGET_ROLES.some((r) => combined.includes(r))) continue;

    const companyName = extractCompanyFromLeadershipHeadline(String(item.title || ''));
    const domain = extractDomainFromText(String(item.url || '') + ' ' + String(item.description || ''));

    if (!companyName) continue;

    signals.push({
      signal_type: 'leadership_change',
      company_name: companyName,
      company_domain: domain,
      headline: String(item.title || ''),
      signal_url: String(item.url || ''),
      signal_date: extractDate(item) || new Date().toISOString().split('T')[0],
      raw_data: item as Record<string, unknown>,
    });
  }

  return signals;
}

function extractCompanyFromLeadershipHeadline(headline: string): string | null {
  // "Acme Corp Appoints Jane Smith as VP Sales"
  // "Jane Smith Joins Acme Corp as CRO"
  const patterns = [
    /^([A-Z][A-Za-z0-9\s\.&,]+?)\s+(?:appoints?|names?|hires?|promotes?)\s+/i,
    /\bjoins\s+([A-Z][A-Za-z0-9\s\.&,]+?)\s+as\b/i,
  ];
  for (const pattern of patterns) {
    const match = headline.match(pattern);
    if (match?.[1] && match[1].length < 50) return match[1].trim();
  }
  return null;
}

function extractDate(item: ApifyDatasetItem): string | null {
  const raw = item.date || item.publishedAt;
  if (!raw) return null;
  try {
    return new Date(String(raw)).toISOString().split('T')[0];
  } catch { return null; }
}
```

- [ ] **Step 6: Write the ingest API route**

```typescript
// src/app/api/pipeline/ingest/route.ts
// ============================================
// Called by daily cron at 6 AM.
// Starts Apify actor runs for all enabled signal sources.
// Returns run IDs — actual processing happens when /check is called.
// ============================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { runGoogleSearch, runLinkedInJobsSearch } from '@/lib/apify';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { data: sources } = await supabase
      .from('signal_sources')
      .select('*')
      .eq('enabled', true);

    if (!sources?.length) {
      return NextResponse.json({ started: 0 });
    }

    const runs: { source: string; runId: string; datasetId: string }[] = [];

    for (const source of sources) {
      try {
        let run: { runId: string; datasetId: string };

        if (source.name === 'linkedin_jobs_sales') {
          run = await runLinkedInJobsSearch(source.search_queries, 'United States', 100);
        } else {
          // Google News sources
          run = await runGoogleSearch(source.search_queries, 5);
        }

        runs.push({ source: source.name, ...run });

        // Store run ID so /check can poll it
        await supabase.from('signal_sources').update({
          last_run_at: new Date().toISOString(),
          last_run_id: run.runId,
        }).eq('id', source.id);
      } catch (err) {
        console.error(`Failed to start actor for ${source.name}:`, err);
      }
    }

    return NextResponse.json({ started: runs.length, runs });
  } catch (err) {
    console.error('Ingest error:', err);
    return NextResponse.json({ error: 'Ingest failed' }, { status: 500 });
  }
}
```

- [ ] **Step 7: Write the check + ingest-results route**

```typescript
// src/app/api/pipeline/check/route.ts
// ============================================
// Called by the dashboard every 30s while actors are running.
// Polls Apify run statuses, ingests completed datasets,
// creates pipeline_leads from new signals.
// ============================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getRunStatus, getDatasetItems } from '@/lib/apify';
import type { ParsedSignal } from '@/lib/gtm/types';
import { parseFundingSignals } from '@/lib/signals/funding';
import { parseJobPostingSignals } from '@/lib/signals/job-postings';
import { parseLeadershipSignals } from '@/lib/signals/leadership';
import { filterSignalByIcp } from '@/lib/signals/icp-filter';
import { scoreSignal, MIN_SIGNAL_SCORE } from '@/lib/signals/scorer';
import { hasRecentSignal } from '@/lib/signals/deduplicator';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { data: sources } = await supabase
      .from('signal_sources')
      .select('*')
      .eq('enabled', true)
      .not('last_run_id', 'is', null);

    if (!sources?.length) return NextResponse.json({ status: 'idle', processed: 0 });

    let totalIngested = 0;
    let allDone = true;

    for (const source of sources) {
      if (!source.last_run_id) continue;

      const runStatus = await getRunStatus(source.last_run_id);

      if (runStatus.status === 'RUNNING') {
        allDone = false;
        continue;
      }

      if (runStatus.status !== 'SUCCEEDED') continue;

      const items = await getDatasetItems(runStatus.defaultDatasetId, 200);

      // Parse based on source type
      let parsed: ParsedSignal[] = [];
      if (source.name === 'google_news_funding') parsed = parseFundingSignals(items);
      else if (source.name === 'linkedin_jobs_sales') parsed = parseJobPostingSignals(items);
      else if (source.name === 'google_news_leadership') parsed = parseLeadershipSignals(items);

      for (const signal of parsed) {
        // ICP filter
        const icpResult = filterSignalByIcp(signal);
        if (!icpResult.passes) continue;

        // Dedup check
        if (signal.company_domain) {
          const recent = await hasRecentSignal(signal.company_domain, signal.signal_type);
          if (recent) continue;
        }

        // Score
        const score = scoreSignal(signal.signal_type, signal.signal_date, signal.headline);
        if (score < MIN_SIGNAL_SCORE) continue;

        // Insert raw signal
        const { data: rawSignal, error } = await supabase
          .from('raw_signals')
          .insert({
            source_name: source.name,
            signal_type: signal.signal_type,
            company_name: signal.company_name,
            company_domain: signal.company_domain,
            headline: signal.headline,
            signal_url: signal.signal_url,
            signal_date: signal.signal_date,
            score,
            raw_data: signal.raw_data,
          })
          .select('id')
          .single();

        if (error || !rawSignal) continue;

        // Create pipeline lead (pending enrichment)
        await supabase.from('pipeline_leads').insert({
          signal_id: rawSignal.id,
          company_name: signal.company_name,
          company_domain: signal.company_domain || '',
          signal_type: signal.signal_type,
          signal_summary: signal.headline,
          signal_date: signal.signal_date,
          signal_score: score,
          status: 'pending',
        });

        totalIngested++;
      }

      // Clear the run ID so we don't re-process
      await supabase.from('signal_sources').update({ last_run_id: null }).eq('id', source.id);
    }

    return NextResponse.json({
      status: allDone ? 'complete' : 'running',
      ingested: totalIngested,
    });
  } catch (err) {
    console.error('Check error:', err);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/signals/ src/app/api/pipeline/ingest/ src/app/api/pipeline/check/
git commit -m "feat: add signal processors and ingestion pipeline"
```

---

## Task 6: Enrichment Engine

**Files:**
- Create: `src/lib/enrichment/contact-finder.ts`
- Create: `src/lib/enrichment/research-agent.ts`
- Create: `src/lib/enrichment/campaign-mapper.ts`

**Depends on:** Tasks 1, 2, 4, 5

- [ ] **Step 1: Write the contact finder**

```typescript
// src/lib/enrichment/contact-finder.ts
// ============================================
// Finds the best decision maker at a company.
// Uses Google search to find likely LinkedIn profiles
// for high-value titles, then extracts name + title.
// ============================================

import { runGoogleSearch, getRunStatus, getDatasetItems } from '@/lib/apify';
import { isTitleInIcp } from '@/lib/signals/icp-filter';

export interface Contact {
  first_name: string;
  last_name: string;
  title: string;
  linkedin_url: string | null;
  source: string;
}

const TARGET_TITLE_SEARCHES = [
  'VP Sales',
  'Head of Sales',
  'Chief Revenue Officer',
  'VP Marketing',
  'Head of Growth',
  'CEO Founder',
];

export async function findDecisionMaker(
  companyName: string,
  companyDomain: string,
): Promise<Contact | null> {
  // Search Google for the decision maker at this company
  const queries = TARGET_TITLE_SEARCHES.slice(0, 3).map(
    (title) => `site:linkedin.com/in "${companyName}" "${title}"`
  );

  try {
    const { runId, datasetId } = await runGoogleSearch(queries, 3);

    // Poll for completion (max 30s)
    let items: Record<string, unknown>[] = [];
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const status = await getRunStatus(runId);
      if (status.status === 'SUCCEEDED') {
        items = await getDatasetItems(datasetId, 10) as Record<string, unknown>[];
        break;
      }
      if (status.status === 'FAILED') break;
    }

    for (const item of items) {
      const url = String(item.url || '');
      const title = String(item.title || '');

      if (!url.includes('linkedin.com/in/')) continue;
      if (!isTitleInIcp(title)) continue;

      const name = extractNameFromLinkedInTitle(title);
      if (!name) continue;

      return {
        first_name: name.firstName,
        last_name: name.lastName,
        title: extractTitleFromLinkedInTitle(title),
        linkedin_url: url,
        source: 'google_linkedin_search',
      };
    }
  } catch (err) {
    console.error('Contact finder error:', err);
  }

  return null;
}

function extractNameFromLinkedInTitle(title: string): { firstName: string; lastName: string } | null {
  // LinkedIn titles: "John Smith - VP Sales at Acme Corp | LinkedIn"
  const match = title.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\s*[-–|]/);
  if (!match) return null;
  return { firstName: match[1], lastName: match[2] };
}

function extractTitleFromLinkedInTitle(title: string): string {
  const match = title.match(/[-–]\s*([^|]+?)\s+at\s+/i);
  return match?.[1]?.trim() || 'Decision Maker';
}
```

- [ ] **Step 2: Write the research agent**

```typescript
// src/lib/enrichment/research-agent.ts
// ============================================
// Signal-aware research using Perplexity + Claude.
// Extends the existing perplexity.ts with signal context
// to generate a personalized opener tied to the specific trigger.
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import type { ResearchResult, SignalType } from '@/lib/gtm/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SIGNAL_RESEARCH_PROMPTS: Record<SignalType, string> = {
  funding: 'What are they planning to do with the funding? What are they hiring for? What growth stage are they at? What problems will they face scaling?',
  job_posting: 'What does this hiring signal indicate about their growth stage and operational needs? What pain points does this role suggest they have?',
  leadership_change: 'What has this person built at their previous company? What are they likely to change or evaluate first in their new role? What tools/vendors do people in this role typically evaluate?',
  news: 'What does this news signal about the company direction? What opportunities or challenges does it create?',
};

async function searchPerplexity(query: string): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [{ role: 'user', content: query }],
      max_tokens: 400,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function researchLead(params: {
  companyName: string;
  domain: string;
  firstName: string;
  lastName: string;
  title: string;
  signalType: SignalType;
  signalSummary: string;
}): Promise<ResearchResult> {
  const { companyName, domain, firstName, lastName, title, signalType, signalSummary } = params;

  // 3 parallel Perplexity searches
  const [companyResearch, signalContext, contactResearch] = await Promise.all([
    searchPerplexity(
      `${companyName} (${domain}): what do they do, who are their customers, how many employees, what's their tech stack, are they B2B SaaS?`
    ),
    searchPerplexity(
      `${companyName} ${signalSummary}. ${SIGNAL_RESEARCH_PROMPTS[signalType]}`
    ),
    searchPerplexity(
      `${firstName} ${lastName} ${title} at ${companyName}: background, previous companies, what have they built before, LinkedIn activity`
    ),
  ]);

  // Claude synthesizes a personalized opener
  const synthesis = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `You are writing a cold email opening line. It must sound like a human who did their homework — not AI.

SIGNAL: ${signalSummary}
COMPANY: ${companyName}
CONTACT: ${firstName} ${lastName}, ${title}

COMPANY INTEL:
${companyResearch}

SIGNAL CONTEXT:
${signalContext}

CONTACT PROFILE:
${contactResearch}

Write:
1. A 1-sentence personalized opener for a cold email that naturally references the specific signal
2. Three bullet pain points this company likely has RIGHT NOW given the signal
3. Three opportunity signals (reasons they'd be receptive)
4. A 2-sentence research summary

Rules:
- Opener must reference the SPECIFIC signal (funding amount, role they're hiring for, etc.)
- No em dashes. No "I noticed". No "I came across". No "Congratulations on".
- Sound like you follow the space, not like you scraped a database.
- Be direct and specific.

Output as JSON: { "opener": "...", "pain_points": ["...", "...", "..."], "opportunity_signals": ["...", "...", "..."], "summary": "..." }`
    }],
  });

  const text = synthesis.content[0].type === 'text' ? synthesis.content[0].text : '';
  let parsed: {
    opener: string;
    pain_points: string[];
    opportunity_signals: string[];
    summary: string;
  };

  try {
    parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
  } catch {
    parsed = { opener: '', pain_points: [], opportunity_signals: [], summary: '' };
  }

  return {
    company_overview: companyResearch,
    pain_signals: parsed.pain_points || [],
    opportunity_signals: parsed.opportunity_signals || [],
    personalized_opener: parsed.opener || '',
    research_summary: parsed.summary || '',
    contact_profile: contactResearch,
    raw_research: { company: companyResearch, signal: signalContext, contact: contactResearch },
  };
}
```

- [ ] **Step 3: Write the campaign mapper**

```typescript
// src/lib/enrichment/campaign-mapper.ts
// ============================================
// Maps signal types to Instantly campaign IDs.
// Configure via env vars — keeps campaign IDs out of code.
// ============================================

import type { SignalType } from '@/lib/gtm/types';

export function getCampaignId(signalType: SignalType): string | null {
  const mapping: Record<SignalType, string | undefined> = {
    funding: process.env.CAMPAIGN_ID_FUNDING,
    job_posting: process.env.CAMPAIGN_ID_JOB_POSTING,
    leadership_change: process.env.CAMPAIGN_ID_LEADERSHIP,
    news: process.env.CAMPAIGN_ID_NEWS,
  };
  return mapping[signalType] || process.env.CAMPAIGN_ID_DEFAULT || null;
}
```

Add to `.env.example`:
```
CAMPAIGN_ID_FUNDING=
CAMPAIGN_ID_JOB_POSTING=
CAMPAIGN_ID_LEADERSHIP=
CAMPAIGN_ID_NEWS=
CAMPAIGN_ID_DEFAULT=
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/enrichment/
git commit -m "feat: add enrichment engine (contact finder, research agent, campaign mapper)"
```

---

## Task 7: Pipeline Orchestrator + API Routes

**Files:**
- Create: `src/lib/pipeline/processor.ts`
- Create: `src/app/api/pipeline/process/route.ts`
- Create: `src/app/api/pipeline/leads/route.ts`

**Depends on:** Tasks 4, 5, 6

- [ ] **Step 1: Write the pipeline processor**

```typescript
// src/lib/pipeline/processor.ts
// ============================================
// Processes a single pending pipeline_lead through
// the full enrichment chain:
//   contact → email find → verify → research → push
// ============================================

import { supabase } from '@/lib/supabase/client';
import { findDecisionMaker } from '@/lib/enrichment/contact-finder';
import { findEmail } from '@/lib/finder';
import { researchLead } from '@/lib/enrichment/research-agent';
import { getCampaignId } from '@/lib/enrichment/campaign-mapper';
import { addLeadsToCampaign } from '@/lib/instantly';
import type { PipelineLead, SignalType } from '@/lib/gtm/types';

async function updateLead(id: string, updates: Partial<PipelineLead>) {
  await supabase
    .from('pipeline_leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function processPipelineLead(lead: PipelineLead): Promise<void> {
  const { id, company_name, company_domain, signal_type, signal_summary, signal_date } = lead;

  try {
    // Step 1: Find decision maker
    await updateLead(id, { status: 'finding_contact' });
    const contact = await findDecisionMaker(company_name || '', company_domain);

    if (!contact) {
      await updateLead(id, { status: 'failed', failure_reason: 'no_contact_found' });
      return;
    }

    await updateLead(id, {
      first_name: contact.first_name,
      last_name: contact.last_name,
      title: contact.title,
      linkedin_url: contact.linkedin_url,
    });

    // Step 2: Find email
    await updateLead(id, { status: 'finding_email' });
    const emailResult = await findEmail(contact.first_name, contact.last_name, company_domain);

    if (!emailResult.found || !emailResult.email) {
      await updateLead(id, { status: 'failed', failure_reason: 'email_not_found' });
      return;
    }

    await updateLead(id, {
      email: emailResult.email,
      email_verified: emailResult.verdict === 'valid',
      email_verdict: emailResult.verdict,
      email_score: emailResult.score,
      email_found_via: emailResult.found_via,
      status: 'verifying',
    });

    // Only push verified emails
    if (emailResult.verdict !== 'valid') {
      await updateLead(id, { status: 'filtered', failure_reason: `email_verdict_${emailResult.verdict}` });
      return;
    }

    // Step 3: AI Research
    await updateLead(id, { status: 'researching' });
    const research = await researchLead({
      companyName: company_name || '',
      domain: company_domain,
      firstName: contact.first_name,
      lastName: contact.last_name,
      title: contact.title,
      signalType: signal_type as SignalType,
      signalSummary: signal_summary || '',
    });

    await updateLead(id, {
      research_summary: research.research_summary,
      pain_points: research.pain_signals,
      opportunity_signals: research.opportunity_signals,
      personalized_opener: research.personalized_opener,
      research_data: research.raw_research,
    });

    // Step 4: Push to Instantly
    const campaignId = getCampaignId(signal_type as SignalType);
    if (!campaignId) {
      await updateLead(id, { status: 'ready', failure_reason: 'no_campaign_configured' });
      return;
    }

    const pushResult = await addLeadsToCampaign(campaignId, [{
      email: emailResult.email,
      first_name: contact.first_name,
      last_name: contact.last_name,
      company_name: company_name || undefined,
    }]);

    if (pushResult.error) {
      await updateLead(id, { status: 'failed', failure_reason: `instantly_error: ${pushResult.error}` });
      return;
    }

    await updateLead(id, {
      instantly_campaign_id: campaignId,
      status: 'pushed',
      pushed_at: new Date().toISOString(),
    });

  } catch (err) {
    console.error(`Pipeline processor error for lead ${id}:`, err);
    await updateLead(id, {
      status: 'failed',
      failure_reason: err instanceof Error ? err.message : 'unknown_error',
    });
  }
}
```

- [ ] **Step 2: Write the process route (client-driven)**

```typescript
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
      .order('signal_score', { ascending: false }) // highest signal first
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
```

- [ ] **Step 3: Write the leads API route**

```typescript
// src/app/api/pipeline/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50');

  let query = supabase
    .from('pipeline_leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/pipeline/ src/app/api/pipeline/process/ src/app/api/pipeline/leads/
git commit -m "feat: add pipeline orchestrator and process/leads API routes"
```

---

## Task 8: Pipeline Dashboard UI

**Files:**
- Create: `src/app/dashboard/pipeline/page.tsx`
- Modify: `src/app/dashboard/layout.tsx`

**Depends on:** Task 7

- [ ] **Step 1: Write the pipeline dashboard**

```typescript
// src/app/dashboard/pipeline/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PipelineLead, PipelineStatus } from '@/lib/gtm/types';

const STATUS_CONFIG: Record<PipelineStatus, { label: string; color: string; dot: string }> = {
  pending:          { label: 'Pending',         color: 'text-text-tertiary',  dot: 'bg-text-tertiary' },
  finding_contact:  { label: 'Finding contact', color: 'text-blue-400',       dot: 'bg-blue-400 animate-pulse' },
  finding_email:    { label: 'Finding email',   color: 'text-blue-400',       dot: 'bg-blue-400 animate-pulse' },
  verifying:        { label: 'Verifying',        color: 'text-amber-400',      dot: 'bg-amber-400 animate-pulse' },
  researching:      { label: 'Researching',      color: 'text-purple-400',     dot: 'bg-purple-400 animate-pulse' },
  ready:            { label: 'Ready',            color: 'text-cyan-400',       dot: 'bg-cyan-400' },
  pushed:           { label: 'Pushed',           color: 'text-green-400',      dot: 'bg-green-400' },
  failed:           { label: 'Failed',           color: 'text-red-400',        dot: 'bg-red-400' },
  filtered:         { label: 'Filtered',         color: 'text-text-tertiary',  dot: 'bg-text-tertiary/50' },
};

const SIGNAL_LABELS: Record<string, string> = {
  funding: 'Funding',
  job_posting: 'Job posting',
  leadership_change: 'Leadership change',
  news: 'News',
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [actorStatus, setActorStatus] = useState<'idle' | 'running' | 'complete'>('idle');
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const processRef = useRef<NodeJS.Timeout | null>(null);

  const loadLeads = useCallback(async () => {
    const res = await fetch('/api/pipeline/leads?limit=100');
    const data = await res.json();
    if (res.ok) setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // Start Apify ingestion
  const triggerIngest = useCallback(async () => {
    setIngesting(true);
    setActorStatus('running');
    await fetch('/api/pipeline/ingest', { method: 'POST' });
    setIngesting(false);

    // Poll check endpoint until actors complete
    pollRef.current = setInterval(async () => {
      const res = await fetch('/api/pipeline/check', { method: 'POST' });
      const data = await res.json();
      await loadLeads();
      if (data.status === 'complete') {
        clearInterval(pollRef.current!);
        setActorStatus('complete');
      }
    }, 15000); // check every 15s
  }, [loadLeads]);

  // Client-driven processing loop
  const startProcessing = useCallback(async () => {
    setProcessing(true);
    processRef.current = setInterval(async () => {
      const res = await fetch('/api/pipeline/process', { method: 'POST' });
      const data = await res.json();
      await loadLeads();
      if (data.status === 'idle') {
        clearInterval(processRef.current!);
        setProcessing(false);
      }
    }, 8000); // process one lead every 8s
    // Kick immediately
    fetch('/api/pipeline/process', { method: 'POST' }).then(() => loadLeads());
  }, [loadLeads]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (processRef.current) clearInterval(processRef.current);
  }, []);

  // Stats
  const stats = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pendingCount = stats.pending || 0;
  const activeCount = (stats.finding_contact || 0) + (stats.finding_email || 0) +
    (stats.verifying || 0) + (stats.researching || 0);
  const pushedCount = stats.pushed || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-display text-text-primary">Signal Pipeline</h1>
          <p className="text-sm text-text-tertiary mt-1">
            Daily signal scraping → contact enrichment → email finding → Instantly push.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={triggerIngest}
            disabled={ingesting || actorStatus === 'running'}
            className="px-4 py-2 text-sm bg-bg-surface border border-border-subtle text-text-secondary rounded-lg hover:text-text-primary disabled:opacity-50 transition-colors"
          >
            {ingesting ? 'Starting scrapers...' : actorStatus === 'running' ? 'Scrapers running...' : 'Run scrapers'}
          </button>
          <button
            onClick={startProcessing}
            disabled={processing || pendingCount === 0}
            className="px-4 py-2 text-sm bg-accent-primary text-bg-primary font-medium rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 transition-colors"
          >
            {processing ? `Enriching... (${activeCount} active)` : `Enrich ${pendingCount} leads`}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending',  value: pendingCount,                  color: 'text-text-secondary' },
          { label: 'Active',   value: activeCount,                   color: 'text-blue-400' },
          { label: 'Pushed',   value: pushedCount,                   color: 'text-green-400' },
          { label: 'Failed',   value: (stats.failed || 0) + (stats.filtered || 0), color: 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-bg-surface border border-border-subtle rounded-lg p-4">
            <div className={`text-2xl font-display ${s.color}`}>{s.value}</div>
            <div className="text-xs text-text-tertiary mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Leads table */}
      {loading ? (
        <div className="text-sm text-text-tertiary text-center py-8">Loading...</div>
      ) : leads.length === 0 ? (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-8 text-center">
          <p className="text-sm text-text-secondary">No leads yet.</p>
          <p className="text-xs text-text-tertiary mt-1">Run scrapers to pull today's signals.</p>
        </div>
      ) : (
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_120px_140px] gap-3 px-4 py-2.5 bg-bg-surface-hover text-[10px] uppercase tracking-wider text-text-tertiary border-b border-border-subtle">
            <span>Company</span>
            <span>Contact</span>
            <span>Signal</span>
            <span>Score</span>
            <span>Status</span>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-border-subtle">
            {leads.map((lead) => {
              const sc = STATUS_CONFIG[lead.status];
              return (
                <div
                  key={lead.id}
                  className="grid grid-cols-[1.5fr_1fr_1fr_120px_140px] gap-3 px-4 py-3 text-sm hover:bg-bg-surface-hover/50 transition-colors"
                >
                  <div>
                    <div className="text-text-primary font-medium truncate">{lead.company_name || lead.company_domain}</div>
                    <div className="text-xs text-text-tertiary font-mono truncate">{lead.company_domain}</div>
                  </div>
                  <div>
                    {lead.first_name ? (
                      <>
                        <div className="text-text-secondary truncate">{lead.first_name} {lead.last_name}</div>
                        <div className="text-xs text-text-tertiary truncate">{lead.title}</div>
                      </>
                    ) : (
                      <span className="text-text-tertiary text-xs">Not found yet</span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary">{SIGNAL_LABELS[lead.signal_type || ''] || lead.signal_type}</div>
                    <div className="text-xs text-text-tertiary truncate mt-0.5">{timeAgo(lead.created_at)}</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-14 h-1.5 bg-bg-primary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          (lead.signal_score || 0) >= 80 ? 'bg-green-400' :
                          (lead.signal_score || 0) >= 60 ? 'bg-amber-400' : 'bg-text-tertiary'
                        }`}
                        style={{ width: `${lead.signal_score || 0}%` }}
                      />
                    </div>
                    <span className="ml-2 text-xs font-mono text-text-tertiary">{lead.signal_score}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                    <span className={`text-xs ${sc.color}`}>{sc.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add Pipeline to nav**

In `src/app/dashboard/layout.tsx`, add a Pipeline nav item alongside the existing nav items (Replies, Verify, Knowledge, Settings). Use an appropriate icon (e.g., `Zap` from lucide-react for "signal-based").

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/pipeline/ src/app/dashboard/layout.tsx
git commit -m "feat: add pipeline dashboard UI"
```

---

## Task 9: Config + Cron + Deploy

**Files:**
- Modify: `vercel.json`
- Modify: `.env.example`

- [ ] **Step 1: vercel.json cron — Hobby plan allows ONE cron only**

Vercel Hobby plan supports exactly one cron job. The existing cron (`/api/cron/auto-send`) must remain. Pipeline ingest is triggered manually from the dashboard "Run scrapers" button.

To automate ingest on Hobby: update `/api/cron/auto-send` to also trigger the pipeline ingest at the end of its run (fire-and-forget):

In `src/app/api/cron/auto-send/route.ts`, add at the end before the return:
```typescript
// Trigger pipeline ingest (fire-and-forget — non-blocking)
fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://coldcrafthq.com'}/api/pipeline/ingest`, {
  method: 'POST',
}).catch(console.error);
```

This piggybacks on the existing daily cron. When upgrading to Vercel Pro, add a dedicated cron entry for `/api/pipeline/ingest` at `0 6 * * *` and remove this piggyback.

`vercel.json` does NOT need to be changed.

- [ ] **Step 2: Update .env.example**

```bash
# Apify (signal scraping)
APIFY_API_KEY=

# ICP configuration (comma-separated, optional — defaults are sensible)
ICP_TARGET_TITLES=CEO,Founder,VP Sales,VP of Sales,Head of Sales,CRO,VP Marketing,CMO,Head of Growth
ICP_EXCLUDE_INDUSTRIES=government,non-profit,education
ICP_GEOGRAPHIES=US,United States,UK,Canada,Australia
ICP_MIN_FUNDING_M=0.5
ICP_MAX_FUNDING_M=100
MIN_SIGNAL_SCORE=55

# Campaign mapping (Instantly campaign IDs per signal type)
CAMPAIGN_ID_FUNDING=
CAMPAIGN_ID_JOB_POSTING=
CAMPAIGN_ID_LEADERSHIP=
CAMPAIGN_ID_NEWS=
CAMPAIGN_ID_DEFAULT=
```

- [ ] **Step 3: Add all env vars to Vercel**

```bash
vercel env add APIFY_API_KEY production
vercel env add CAMPAIGN_ID_FUNDING production
vercel env add CAMPAIGN_ID_JOB_POSTING production
vercel env add CAMPAIGN_ID_LEADERSHIP production
vercel env add CAMPAIGN_ID_DEFAULT production
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Deploy to production**

```bash
vercel --prod
```

- [ ] **Step 6: Verify pipeline ingest works**

Hit `POST https://coldcrafthq.com/api/pipeline/ingest` manually (or via dashboard "Run scrapers" button). Check Supabase `signal_sources` table — `last_run_id` should be populated.

Wait 15–30 minutes for Apify actors to complete. Then open the dashboard and click "Enrich leads".

- [ ] **Step 7: Final commit**

```bash
git add .env.example src/app/api/cron/auto-send/route.ts
git commit -m "feat: complete GTM intelligence engine — signals, enrichment, finder, pipeline"
```

---

## Summary: What Gets Built

| Component | Value |
|-----------|-------|
| **Email Finder** | Find any B2B email from name + domain. Pattern cache compounds with every verified email in the system. Standalone feature usable from verify dashboard or via API (future Clay/external integration). |
| **Signal Scrapers** | 3 Apify sources: funding news, LinkedIn job postings, leadership changes. Daily at 6 AM. |
| **Enrichment Engine** | Contact finder + signal-aware AI research (Perplexity + Claude). Generates a personalized opener specific to the trigger event. |
| **Pipeline Orchestrator** | Fully automated: signal → contact → email → verify → research → Instantly push. Client-driven processing, no cron limitations. |
| **Dashboard** | Live pipeline view with status tracking, manual triggers, signal scores. |

**Expected daily output at full operation:** 10–30 qualified, signal-triggered, personally researched leads pushed to the right Instantly campaign — automatically.
