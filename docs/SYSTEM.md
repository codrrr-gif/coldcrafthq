# ColdCraft HQ — Complete System Documentation

> Built: March 2026
> Stack: Next.js 14, TypeScript, Supabase, Vercel Hobby, Instantly AI, Reacher SMTP, Apify, Perplexity, Claude Sonnet

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Infrastructure & Stack](#2-infrastructure--stack)
3. [Reply Engine (V3)](#3-reply-engine-v3)
4. [Email Verification Pipeline](#4-email-verification-pipeline)
5. [Email Finder](#5-email-finder)
6. [GTM Intelligence Engine](#6-gtm-intelligence-engine)
   - [6.1 Signal Detection](#61-signal-detection)
   - [6.2 Enrichment Engine](#62-enrichment-engine)
   - [6.3 Pipeline Orchestrator](#63-pipeline-orchestrator)
   - [6.4 Pipeline Dashboard](#64-pipeline-dashboard)
7. [Daily Automation Flow](#7-daily-automation-flow)
8. [Database Schema](#8-database-schema)
9. [API Reference](#9-api-reference)
10. [Environment Variables](#10-environment-variables)
11. [Known Limitations](#11-known-limitations)
12. [Roadmap](#12-roadmap)

---

## 1. System Overview

ColdCraft HQ is a solo-operator cold outreach platform that turns real-time business signals into personalized, verified, campaign-ready leads — with minimal manual work. It is not a prospecting database or a blast emailer. It is a signal-to-send pipeline: events like funding announcements, sales hires, and leadership changes are detected, qualified, enriched with AI research, and pushed directly into Instantly AI campaigns with a tailored opener for each contact.

The core problem it solves: cold email at scale fails because most of it is generic. ColdCraft HQ makes it possible for one person to run highly personalized outreach to dozens of new leads per day by automating every step between "something happened at this company" and "a personal-sounding email is queued."

### The 4 Main Subsystems

**Reply Engine (V3)** — handles the back half of outreach. Reads inbound email replies from Instantly, generates AI responses with full conversation context and company knowledge base, scores them for confidence, auto-sends high-confidence replies, and queues low-confidence ones for human review. Learns from outcomes over time by scoring silence as a negative signal.

**Email Verification Pipeline** — 6-layer verification system that confirms whether an email address actually exists before sending. Uses format checks, MX record lookup, SMTP handshake via a self-hosted Reacher VPS, catch-all detection, and optional external APIs (MillionVerifier, FindyMail). Supports bulk CSV upload with async job tracking.

**Email Finder** — given a name and domain, finds the person's business email by generating permutations of common B2B patterns (first.last, flast, firstlast, etc.) and testing them via SMTP. Builds a `domain_patterns` confidence cache over time so repeated queries on the same domain skip SMTP testing entirely.

**GTM Intelligence Engine** — the newest subsystem (V5). Scrapes three signal sources via Apify (Google News for funding, LinkedIn Jobs for sales hires, Google News for leadership changes), scores and deduplicates signals, finds the decision-maker contact at each company, verifies their email, runs AI research via Perplexity and Claude, then pushes the fully enriched lead to the correct Instantly campaign.

### How They Connect

The cron fires daily, which triggers Reply Engine maintenance and kicks off a background Apify scrape. When actors finish (30-120 minutes later), the dashboard's polling loop ingests the results into `pipeline_leads`. The user then clicks "Enrich N leads" on the pipeline dashboard and the system sequentially enriches each lead — finding the contact, finding and verifying their email, running AI research — and pushes them to Instantly. Instantly sends the campaign sequence using the `{{personalized_opener}}` custom variable that was generated per-lead. Replies come back through the Instantly webhook, the Reply Engine processes them, and the loop continues.

### Who Benefits

This is purpose-built for a solo operator running cold outreach at a volume that would otherwise require a full SDR team. The system handles the research, personalization, and email hygiene work that normally makes personalized outreach impossible to scale past a handful of leads per day.

---

## 2. Infrastructure & Stack

### Vercel (Hobby Plan)

Hosts the Next.js app and serverless functions. Key constraints on the Hobby plan:

- 1 cron job maximum (currently used by `/api/cron/auto-send`)
- Default function timeout: 10 seconds
- Maximum function duration: 300 seconds (configured via `export const maxDuration = 300` on long-running routes like `/api/pipeline/process`)
- No dedicated pipeline cron — the GTM ingest is piggybacked onto the daily reply engine cron via a fire-and-forget POST

Deployment is fully automated: `git push` to main triggers a Vercel build and the new version is live in approximately 30 seconds.

### Supabase Postgres

All persistent state lives in Supabase. This includes reply engine state (threads, replies, knowledge base), verification jobs and results, email finder pattern cache, and all GTM pipeline state (signal sources, raw signals, pipeline leads). The Supabase service role key is used server-side only; no client-side Supabase access.

### Instantly AI

Manages email sending infrastructure, campaign sequences, and bounce handling. ColdCraft pushes leads directly to Instantly campaigns via the Instantly API, using custom variables (including `personalized_opener`) that are merged into campaign templates. Instantly sends a webhook back to ColdCraft when replies arrive or bounces are detected.

### Reacher SMTP VPS

A self-hosted instance of the open-source Reacher email verifier, running at `verify.coldcrafthq.com` on a Netcup VPS. Used for SMTP handshake verification in both the Email Finder permutation loop and the 6-layer verification pipeline. Self-hosting avoids per-verification API costs and allows SMTP testing at volume. Protected by a `REACHER_API_KEY`.

### Apify

Actor-based web scraping platform used by the GTM Intelligence Engine. Three actors are configured:

- `apify/google-search-scraper` — used for both funding news and leadership change signals
- `bebity/linkedin-jobs-scraper` — used for sales and GTM role job postings

Actors are started via the Apify API and run asynchronously. Results are fetched from Apify datasets after completion, which typically takes 30-120 minutes.

### Perplexity (sonar-pro)

Real-time web search used in the enrichment research agent. Three parallel queries are run per lead: company overview, signal context, and contact profile. Responses are capped at 400 tokens each and passed as context to Claude for synthesis.

### Claude Sonnet 4.6 (Anthropic)

Used in two places: the Reply Engine (generating responses to inbound replies with knowledge base context) and the research agent (synthesizing Perplexity results into a personalized opener, pain points, opportunity signals, and research summary). Outputs structured JSON.

### MillionVerifier + FindyMail

Optional external verification APIs. MillionVerifier handles bulk email verification as layer 5 of the verification pipeline. FindyMail can find verified emails from name and domain as layer 6. Both are disabled by default in the Email Finder's SMTP permutation loop (`use_million_verifier: false`, `use_findymail: false`) to reduce cost per lookup.

---

## 3. Reply Engine (V3)

The Reply Engine handles all inbound email activity generated by Instantly campaigns.

### How It Works

When a prospect replies to a campaign email, Instantly fires a webhook to `/api/webhooks/instantly`. ColdCraft fetches the full email thread, constructs a context object containing the thread history and relevant knowledge base entries, and sends it to Claude Sonnet 4.6 to generate a reply. The reply is scored 0-100 for confidence.

**Auto-send:** Replies that score above the configured confidence threshold are sent immediately without human review.

**Review queue:** Replies below the threshold are held in the dashboard at `/dashboard/` where they can be reviewed, edited, approved, regenerated from scratch, revised with a specific instruction, or skipped.

### Self-Improvement Loop

The cron job at `/api/cron/auto-send` runs three operations daily (in parallel):

1. `processTimeoutAutoSends()` — sends any reply that has been sitting in pending state past the auto-send timeout, regardless of score.
2. `evaluateSilentOutcomes()` — scans threads where a reply was sent 3+ days ago and no response has arrived. Scores these as negative outcomes.
3. `tuneThresholds()` — adjusts per-template or per-signal-type confidence thresholds based on accumulated outcome data. Templates with high silence rates get higher thresholds (more conservative); templates with positive reply rates get lower thresholds (more aggressive auto-sending).

### Bounce Handling

The `/api/webhooks/instantly/bounce` endpoint receives bounce events from Instantly. Bounce data is written to a ColdCraft bounce history table so the same address is never attempted again.

---

## 4. Email Verification Pipeline

The verification pipeline confirms whether an email address is safe to send to before it enters any campaign. It runs as a 6-layer waterfall, stopping at the first definitive answer.

### The 6 Layers

**Layer 1 — Format validation:** Regex check that the address matches a valid email format. Fails immediately on malformed addresses.

**Layer 2 — MX record lookup:** DNS query to confirm the domain has mail exchanger records. A domain without MX records cannot receive email.

**Layer 3 — SMTP handshake via Reacher:** Connects to the domain's mail server and simulates an SMTP delivery attempt without actually sending a message. The server's response code reveals whether the mailbox exists. This is the primary verification method and runs through the self-hosted Reacher VPS at `verify.coldcrafthq.com`.

**Layer 4 — Catch-all detection:** Some domains (common with large GSuite deployments) are configured to accept any incoming address regardless of whether the mailbox exists. Reacher detects this. Catch-all domains cannot have individual mailboxes confirmed.

**Layer 5 — MillionVerifier:** Optional external bulk verification API. Used when the SMTP handshake result is ambiguous and a secondary opinion is needed.

**Layer 6 — FindyMail enrichment:** If the email address couldn't be confirmed but the person's name and domain are known, FindyMail can attempt to find a verified email directly. This is used as a last resort.

### Verdicts

| Verdict | Meaning |
|---|---|
| `valid` | Confirmed deliverable |
| `risky` | Likely deliverable but uncertain (catch-all or soft bounce risk) |
| `invalid` | Confirmed undeliverable |
| `do_not_send` | Known bad actor, spam trap, or previous hard bounce |
| `unknown` | Could not determine |

Only `valid` addresses are pushed to Instantly campaigns by the pipeline processor.

### Bulk Verification Flow

Users can upload a CSV of email addresses via the verification dashboard. A verification job is created, assigned a job ID, and processed asynchronously. The dashboard polls `/api/verify/status/[jobId]` until complete, then results are available at `/api/verify/results/[jobId]`. Verified leads can be pushed to a specific Instantly campaign via `/api/verify/push`.

---

## 5. Email Finder

Given a first name, last name, and company domain, the Email Finder constructs a working business email address by combining pattern knowledge with live SMTP testing.

### How It Works

The finder tries up to three strategies in order:

**Step 1 — Pattern cache lookup:** Queries the `domain_patterns` table for a cached winning pattern for the domain. If a pattern exists with confidence >= 60, it constructs the email using that pattern (e.g., `first.last@domain.com`), verifies it via Reacher SMTP, and returns it immediately if valid. This short-circuits the permutation loop entirely for known domains.

**Step 2 — SMTP permutation loop:** Generates all permutations of the name against the domain, ordered by B2B prevalence:

- `first.last` (most common)
- `firstlast`
- `flast`
- `f.last`
- `first`
- `last.first`
- `lastfirst`
- `first_last`

Each candidate is tested via Reacher SMTP. The first one that returns `valid` is returned as the result, and the `domain_patterns` table is updated to record this as the winning pattern for the domain.

**Step 3 — Catch-all fallback:** If the SMTP loop detects the domain is catch-all (meaning the mail server accepts any address), SMTP testing cannot confirm individual mailboxes. The finder returns the first (most probable) permutation as an unconfirmed result with `found: false` and `verdict: 'unknown'`.

### Domain Patterns Cache

The `domain_patterns` table is the Email Finder's long-term memory. Every successfully found email updates the table:

- If the new result matches the existing cached pattern: confidence increases (+2 to +12 points depending on sample count, capped at 100).
- If the new result contradicts the cached pattern: confidence decreases (-15 points).

This means accuracy compounds over time. As more emails are found at a given domain, the probability of needing the full permutation loop decreases.

### Comparison to Hunter.io / FindyMail

The mechanism is identical to commercial email finders — generate permutations, test via SMTP, cache results. The difference is this is self-hosted, running SMTP through a dedicated VPS, which avoids per-lookup API costs and rate limits.

---

## 6. GTM Intelligence Engine

The GTM Intelligence Engine is the signal detection, enrichment, and push pipeline introduced in the V5 migration. It monitors for buying signals — funding rounds, sales team growth, leadership changes — and converts each signal into a fully personalized, verified, campaign-ready lead.

### 6.1 Signal Detection

Three Apify actors scrape signal sources on a daily schedule:

**`google_news_funding` (apify/google-search-scraper)**
Searches Google News for articles about funding rounds using queries like `"series A" OR "series B" "raised" SaaS software 2025`. Parsed by `funding.ts`. Funding signals start at a base score of 100.

**`linkedin_jobs_sales` (bebity/linkedin-jobs-scraper)**
Searches LinkedIn Jobs for sales and GTM roles: VP Sales, Head of Sales, Director of Sales, Chief Revenue Officer, Head of Growth, SDR, Revenue Operations. Searches are filtered to United States, up to 100 results. Parsed by `job-postings.ts`. Job posting signals start at a base score of 70.

**`google_news_leadership` (apify/google-search-scraper)**
Searches for leadership hire announcements: `"joins as" VP Director Head sales marketing revenue 2025`. Parsed by `leadership.ts`. Leadership change signals start at a base score of 90.

**Scoring**

The `scoreSignal()` function in `scorer.ts` adjusts the base score based on recency and headline content:

- Recency decay: full score within 7 days, -10 per week after (floor: 30)
- Boosters: "series a/b" (+10), "million/raises" (+5), "vp sales/chief revenue" (+10), "head of growth/vp marketing" (+8)
- Penalties: "acquisition/acquired" (-20), "layoff/cuts/shutdown" (-30)

**ICP Filter**

After parsing, each signal passes through `filterSignalByIcp()`. Signals without a company domain are given a synthetic domain derived from the company name (e.g., `acmecorp.com`) to pass the filter — the domain is validated properly during enrichment. Signals are rejected if they match government, education, or military TLDs (`.gov`, `.edu`, `.mil`).

**Deduplication**

`hasRecentSignal()` checks whether the same `company_domain + signal_type` combination has appeared in `raw_signals` within the last 30 days. If so, the signal is skipped. This prevents the same company from flooding the pipeline after a single event generates multiple articles.

**Minimum threshold**

Any signal scoring below `MIN_SIGNAL_SCORE` (default: 55, configurable via env var) is dropped before creating a `pipeline_lead`.

**Flow summary**

```
Apify run → parse → domain fallback → ICP filter → dedup check → score → threshold check → raw_signals insert → pipeline_leads insert (status: pending)
```

### 6.2 Enrichment Engine

Enrichment processes each `pipeline_lead` through three sub-components:

**contact-finder.ts — Decision Maker Discovery**

Uses a 3-level waterfall to find a named decision-maker at the company:

- Level 1: Google `site:linkedin.com/in` search targeting VP Sales, CRO, VP Marketing, and equivalent titles at the company. Name is extracted from the LinkedIn URL and page title, handling hyphenated names, compound last names, and initials.
- Level 2: Apify Cheerio Scraper targeting common team/about/leadership page paths on the company's website (`/team`, `/about`, `/leadership`, `/about-us`, `/company`).
- Level 3: Broad Google search without the `site:` restriction, as a fallback when LinkedIn indexing or the company website yields nothing.

**research-agent.ts — AI Research Pipeline**

Runs three parallel Perplexity `sonar-pro` queries (max 400 tokens each):

1. **Company overview:** What the company does, who their customers are, employee count, tech stack, whether they are B2B SaaS.
2. **Signal context:** What the specific signal (funding/hire/job posting) means for the company right now. Each signal type has a tailored prompt — e.g., for leadership changes: "What has this person built at their previous company? What are they likely to change or evaluate first in their new role?"
3. **Contact profile:** The contact's background, previous companies, what they've built, career history.

Claude Sonnet 4.6 then synthesizes all three into structured JSON:

- `opener`: A 1-sentence personalized opening line that references the specific signal. Used as `{{personalized_opener}}` in Instantly campaign templates.
- `pain_points`: Three bullet points describing problems the company likely has right now given the signal context.
- `opportunity_signals`: Three reasons why the contact would be receptive to outreach at this moment.
- `summary`: A 2-sentence research summary.

Writing rules enforced in the Claude prompt: no em dashes, no "I noticed", no "I came across", no "Congratulations on" — the opener should sound like someone who follows the space, not like a database scrape.

**campaign-mapper.ts — Campaign Routing**

Maps `signal_type` to an Instantly campaign ID via environment variables:

- `funding` → `CAMPAIGN_ID_FUNDING`
- `job_posting` → `CAMPAIGN_ID_JOB_POSTING`
- `leadership_change` → `CAMPAIGN_ID_LEADERSHIP`
- `news` → `CAMPAIGN_ID_NEWS`
- fallback → `CAMPAIGN_ID_DEFAULT`

### 6.3 Pipeline Orchestrator

`processor.ts` contains `processPipelineLead()`, which takes a single `pipeline_lead` row and runs it through the full enrichment chain. Status is written to Supabase after every step, making progress visible in real time on the dashboard.

**Status flow:**

```
pending → finding_contact → finding_email → verifying → researching → pushed
                                                                     → ready (no campaign configured)
         → failed (no_contact_found)
                            → failed (email_not_found)
                                          → filtered (email_verdict_{risky|invalid|unknown})
                                                        → failed (missing_signal_type)
                                                                    → failed (instantly_error: ...)
```

**What gets pushed to Instantly:**

Each lead is pushed to its mapped campaign with the following fields:

| Field | Source |
|---|---|
| `email` | Email Finder result |
| `first_name` | Contact finder |
| `last_name` | Contact finder |
| `company_name` | Signal data |
| `title` | Contact finder |
| `personalized_opener` | Claude synthesis |
| `signal_summary` | Raw signal headline |
| `research_summary` | Claude synthesis |
| `signal_type` | Signal type enum |
| `signal_date` | Signal publication date |

**Processing order:** `/api/pipeline/process` always selects the highest `signal_score` pending lead first (`ORDER BY signal_score DESC`). Best signals are enriched first.

**Client-driven design:** The dashboard calls `/api/pipeline/process` every ~8-10 seconds while leads remain in the queue. This means only one lead is in flight at a time — no concurrent processing, no pileup, and status updates are immediately visible. The 300-second `maxDuration` on the process route accommodates the full enrichment chain (contact finder + SMTP tests + Perplexity + Claude) without timeout.

### 6.4 Pipeline Dashboard

The pipeline dashboard at `/dashboard/pipeline` provides full visibility into the GTM pipeline state.

**Stat cards:** Four counts displayed at the top — Pending, Active (in-progress enrichment), Pushed (sent to Instantly), Failed.

**Live lead table:** Columns include company name, contact name (once found), signal type, signal score (visualized as a 0-100 bar), and status with animated indicators:

- Grey dot: pending
- Blue pulsing dot: finding contact or email
- Amber pulsing dot: verifying email
- Purple pulsing dot: AI research in progress
- Green dot: pushed to Instantly
- Red dot: failed (with failure reason on hover)

**"Run scrapers" button:** Calls `/api/pipeline/ingest` to start the three Apify actors. After clicking, the dashboard polls `/api/pipeline/check` every 15 seconds. The button shows a loading state while actors are running. When all actors complete (status: `complete`), the page refreshes to show newly ingested leads.

**"Enrich N leads" button:** Starts the sequential processing loop. Calls `/api/pipeline/process` repeatedly with a short gap between calls. Stops when no pending leads remain or the user navigates away.

---

## 7. Daily Automation Flow

The following sequence describes exactly what happens over a typical 24-hour cycle.

**1. 9:00 AM UTC — Vercel cron fires**

`GET /api/cron/auto-send` is called by Vercel with the `Authorization: Bearer {CRON_SECRET}` header. Three operations run in parallel:

- `processTimeoutAutoSends()` — sends any reply sitting in the pending queue past the auto-send timeout
- `evaluateSilentOutcomes()` — scores threads where 3+ days have passed with no reply as negative outcomes
- `tuneThresholds()` — adjusts confidence thresholds based on accumulated outcome data

**2. 9:00 AM UTC (concurrent, non-blocking) — Pipeline ingest triggered**

Before returning its response, the cron handler fires a `POST /api/pipeline/ingest` in a fire-and-forget `fetch()` call. This starts the three Apify actors concurrently. Run IDs are saved to `signal_sources.last_run_id`. The cron itself returns immediately without waiting for actors to complete.

**3. ~9:30–11:00 AM — Apify actors complete**

The three actors run independently on Apify's infrastructure. Completion time varies from 30 to 120 minutes depending on Apify queue depth and the number of results. No action required from ColdCraft until the dashboard is opened.

**4. Dashboard-driven — Signal ingestion**

When the user opens `/dashboard/pipeline` and clicks "Run scrapers" (or the dashboard detects a pending run from the cron), it begins polling `POST /api/pipeline/check` every 15 seconds. Each poll:

- Checks Apify run status for all sources with a `last_run_id`
- For completed runs: fetches up to 200 items from the dataset, parses them by source type, applies ICP filter, dedup check, and score threshold
- Creates `raw_signals` and `pipeline_leads` rows for qualifying signals
- Clears `last_run_id` after processing
- Returns `{ status: 'running' | 'complete', ingested: N }`

**5. Dashboard-driven — Lead enrichment**

The user clicks "Enrich N leads." The dashboard enters a sequential loop:

- Calls `POST /api/pipeline/process` (one lead per call, highest signal score first)
- Waits for response before calling again
- Each lead takes approximately 60-300 seconds depending on SMTP permutation count and Perplexity/Claude latency
- Progress is visible in real time via status updates in the lead table

**6. Instantly campaign delivery**

Once pushed, Instantly handles the campaign sequence. Step 1 of the sequence email references `{{personalized_opener}}`. Subsequent follow-up steps use standard templates. Bounce events fire the Instantly bounce webhook back to ColdCraft.

**7. Inbound reply handling**

When a prospect replies, Instantly fires the reply webhook. The Reply Engine processes the thread, generates a response, scores it, and either auto-sends or queues for review. The loop continues.

---

## 8. Database Schema

### Core Tables (V1 — Reply Engine)

**`leads`**
Imported prospect list. Stores contact details and campaign assignment.

**`email_threads`**
Synced from Instantly. One row per active thread. Tracks the full conversation history and current reply engine state.

**`replies`**
AI-generated reply candidates. Linked to a thread. Stores the generated text, confidence score, status (pending / approved / sent / skipped), and outcome tracking fields.

**`knowledge_base`**
Company knowledge used to ground reply generation. Stores product descriptions, common objection handling, case studies, and tone guidelines.

### Verification Tables (V4)

**`verification_jobs`**
Tracks bulk verification batch jobs. Columns: `id`, `filename`, `total_count`, `processed_count`, `status`, `created_at`, `completed_at`.

**`verification_results`**
One row per email address in a verification job. Columns: `job_id`, `email`, `verdict`, `score`, `catch_all`, `mx_found`, `smtp_response`, `verified_at`.

### GTM Tables (V5)

**`domain_patterns`**

| Column | Type | Description |
|---|---|---|
| `domain` | TEXT (PK) | Company domain (e.g., `acmecorp.com`) |
| `pattern` | TEXT | Winning email pattern (e.g., `first.last`) |
| `confidence` | INTEGER (0-100) | Default 50; increases with confirmations, decreases on contradictions |
| `sample_count` | INTEGER | Number of confirmed emails that informed this pattern |
| `last_verified_at` | TIMESTAMPTZ | When the pattern was last confirmed via SMTP |
| `updated_at` | TIMESTAMPTZ | Auto-updated on any change |

Valid pattern values: `first.last`, `firstlast`, `flast`, `f.last`, `first`, `last.first`, `lastfirst`, `first_last`

**`signal_sources`**

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | TEXT (unique) | `google_news_funding`, `linkedin_jobs_sales`, `google_news_leadership` |
| `apify_actor_id` | TEXT | Apify actor identifier |
| `search_queries` | TEXT[] | Array of search strings passed to the actor |
| `enabled` | BOOLEAN | Whether this source runs in the daily cron |
| `run_frequency` | TEXT | `daily` (informational) |
| `last_run_at` | TIMESTAMPTZ | When the last actor run was started |
| `last_run_id` | TEXT | Active Apify run ID (cleared after dataset is ingested) |
| `last_signal_count` | INTEGER | Signals ingested in the most recent run |

**`raw_signals`**

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `source_name` | TEXT | Which signal source generated this |
| `signal_type` | TEXT | `funding`, `job_posting`, `leadership_change`, `news` |
| `company_name` | TEXT | Parsed company name |
| `company_domain` | TEXT | Parsed or derived domain |
| `headline` | TEXT | Original article or job posting headline |
| `signal_url` | TEXT | Source URL |
| `signal_date` | DATE | Publication or posting date |
| `score` | INTEGER (0-100) | Computed signal score |
| `raw_data` | JSONB | Full raw item from Apify dataset |
| `processed` | BOOLEAN | Whether a pipeline_lead was created |
| `filtered_reason` | TEXT | Why the signal was filtered (if applicable) |

Unique index on `(company_domain, signal_type, signal_date)` where `company_domain IS NOT NULL` — prevents duplicate signals for the same event from the same company.

**`pipeline_leads`**

The central enrichment state table. One row per lead, updated in place as it moves through the pipeline.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `signal_id` | UUID (FK → raw_signals) | Source signal |
| `company_name` | TEXT | |
| `company_domain` | TEXT (NOT NULL) | |
| `company_size` | TEXT | Populated during research |
| `company_industry` | TEXT | Populated during research |
| `company_location` | TEXT | Populated during research |
| `company_funding_stage` | TEXT | Populated during research |
| `first_name` | TEXT | Found by contact-finder |
| `last_name` | TEXT | Found by contact-finder |
| `title` | TEXT | Found by contact-finder |
| `linkedin_url` | TEXT | Found by contact-finder |
| `email` | TEXT | Found by email-finder |
| `email_verified` | BOOLEAN | True if verdict is `valid` |
| `email_verdict` | TEXT | `valid`, `risky`, `invalid`, `unknown` |
| `email_score` | INTEGER | Verification confidence score |
| `email_found_via` | TEXT | `pattern_cache`, `smtp_permutation`, or `external` |
| `signal_type` | TEXT | Inherited from raw_signal |
| `signal_summary` | TEXT | Headline used as signal context in research |
| `signal_date` | DATE | |
| `signal_score` | INTEGER | Score at time of ingestion |
| `research_summary` | TEXT | Claude 2-sentence summary |
| `pain_points` | TEXT[] | Claude-generated pain points |
| `opportunity_signals` | TEXT[] | Claude-generated opportunity signals |
| `personalized_opener` | TEXT | Used as `{{personalized_opener}}` in Instantly |
| `research_data` | JSONB | Raw Perplexity responses |
| `instantly_campaign_id` | TEXT | Campaign this lead was pushed to |
| `status` | TEXT | See status flow above |
| `failure_reason` | TEXT | Set on `failed` or `filtered` status |
| `pushed_at` | TIMESTAMPTZ | When the lead was pushed to Instantly |

---

## 9. API Reference

### Pipeline

**`POST /api/pipeline/ingest`**
Starts Apify actor runs for all enabled signal sources. Requires `Authorization: Bearer {CRON_SECRET}` if `CRON_SECRET` is set. Returns `{ started: N, runs: [{ source, runId, datasetId }] }`. Runs actors asynchronously — does not wait for results.

**`POST /api/pipeline/check`**
Polls Apify run statuses, ingests completed datasets, creates `raw_signals` and `pipeline_leads` rows. Called by the dashboard every 15 seconds while actors are running. Returns `{ status: 'running' | 'complete', ingested: N }`.

**`POST /api/pipeline/process`**
Processes the single highest-scored pending `pipeline_lead` through the full enrichment chain. `maxDuration: 300`. Returns `{ status: 'processed', lead_id }` or `{ status: 'idle' }` when no pending leads exist.

**`GET /api/pipeline/leads`**
Paginated list of pipeline leads. Query params: `?status=pending|pushed|failed|...`, `?limit=N`. Returns lead rows with all enrichment fields.

### Email Finder

**`POST /api/finder/find`**
Request body: `{ first_name, last_name, domain }`. Returns `FinderResult`: `{ email, found, pattern, found_via, verdict, score, tried_patterns }`.

**`POST /api/finder/bulk`**
CSV upload. Each row should contain `first_name`, `last_name`, `domain` columns. Returns an enriched CSV with email, verdict, found_via, and tried_patterns columns added.

### Verification

**`POST /api/verify/bulk`**
Upload a CSV of email addresses to start a verification job. Returns `{ job_id }`.

**`GET /api/verify/status/[jobId]`**
Returns job status: `{ status: 'pending' | 'processing' | 'complete', processed_count, total_count }`.

**`GET /api/verify/results/[jobId]`**
Returns verification results for all addresses in the job. Includes verdict, score, and catch-all flag per address.

**`POST /api/verify/push`**
Push verified leads from a completed job to an Instantly campaign. Request body: `{ job_id, campaign_id, verdicts: ['valid'] }` (filter by which verdicts to include).

### Reply Engine

**`GET /api/replies`**
List replies pending human review. Returns reply rows with thread context.

**`POST /api/replies/[id]/approve`**
Approve a generated reply and send it via Instantly.

**`POST /api/replies/[id]/regenerate`**
Discard the current reply and generate a new one from scratch.

**`POST /api/replies/[id]/revise`**
Request body: `{ instruction: string }`. Revises the reply with a specific instruction (e.g., "make it shorter", "be more direct about pricing").

**`POST /api/replies/[id]/skip`**
Mark a reply as skipped (no action taken, removes from review queue).

### Cron

**`GET /api/cron/auto-send`**
Daily automation endpoint. Requires `Authorization: Bearer {CRON_SECRET}`. Processes timeout auto-sends, scores silent outcomes, tunes thresholds, and fire-and-forgets `/api/pipeline/ingest`. Called by Vercel cron at `0 9 * * *` (9:00 AM UTC).

### Webhooks

**`POST /api/webhooks/instantly`**
Receives reply and event notifications from Instantly. Triggers Reply Engine processing for new replies.

**`POST /api/webhooks/instantly/bounce`**
Receives hard bounce notifications from Instantly. Records the bounced address in ColdCraft's bounce history to prevent future sends.

---

## 10. Environment Variables

### Supabase

| Variable | Description | Where to find |
|---|---|---|
| `SUPABASE_URL` | Project API URL | Supabase dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role secret (full database access, server-side only) | Supabase dashboard → Project Settings → API |

### AI & Research

| Variable | Description | Where to find |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API key | console.anthropic.com |
| `PERPLEXITY_API_KEY` | Perplexity sonar-pro API key | perplexity.ai → API settings |

### Email Infrastructure

| Variable | Description | Where to find |
|---|---|---|
| `INSTANTLY_API_KEY` | Instantly API key for campaign management | Instantly → Settings → API |
| `REACHER_URL` | Self-hosted Reacher VPS URL (e.g., `https://verify.coldcrafthq.com`) | VPS setup |
| `REACHER_API_KEY` | Reacher instance API key | Set during Reacher VPS configuration |
| `MILLIONVERIFIER_API_KEY` | Optional bulk verification API | millionverifier.com → API |
| `FINDYMAIL_API_KEY` | Optional email finder API | app.findymail.com → API |

### Scraping

| Variable | Description | Where to find |
|---|---|---|
| `APIFY_API_KEY` | Apify platform API key | console.apify.com → Settings → Integrations |

### App

| Variable | Description | Notes |
|---|---|---|
| `CRON_SECRET` | Secret for authenticating cron and ingest endpoints | Generate a random string; set in Vercel project env vars and `vercel.json` is not needed (Vercel injects it automatically) |
| `NEXT_PUBLIC_APP_URL` | Production URL (e.g., `https://coldcrafthq.com`) | Used by cron to self-call `/api/pipeline/ingest` |

### Campaign Routing

| Variable | Description |
|---|---|
| `CAMPAIGN_ID_FUNDING` | Instantly campaign ID for funding-triggered leads |
| `CAMPAIGN_ID_JOB_POSTING` | Instantly campaign ID for job posting-triggered leads |
| `CAMPAIGN_ID_LEADERSHIP` | Instantly campaign ID for leadership change-triggered leads |
| `CAMPAIGN_ID_NEWS` | Instantly campaign ID for generic news-triggered leads |
| `CAMPAIGN_ID_DEFAULT` | Fallback campaign ID if no type-specific ID is configured |

### ICP Configuration

| Variable | Description | Default |
|---|---|---|
| `ICP_TARGET_TITLES` | Comma-separated target titles for contact finder | `VP Sales,Head of Sales,CRO,VP Marketing,Head of Growth` |
| `ICP_EXCLUDE_INDUSTRIES` | Comma-separated industries to exclude | None |
| `ICP_GEOGRAPHIES` | Comma-separated target geographies | `United States` |
| `ICP_MIN_FUNDING_M` | Minimum funding round size in millions (for funding signals) | None |
| `ICP_MAX_FUNDING_M` | Maximum funding round size in millions | None |
| `MIN_SIGNAL_SCORE` | Minimum score threshold to create a pipeline lead (0-100) | `55` |

---

## 11. Known Limitations

**LinkedIn public indexing coverage is ~40-60%.** The contact-finder's Level 1 approach relies on Google having indexed LinkedIn profiles for the company's decision-makers. Newer companies, small teams, and executives who don't maintain public LinkedIn profiles will not be found this way. Level 2 (website scraping) and Level 3 (broad search) partially compensate but success rates are lower.

**Apify actors take 30-120 minutes.** The pipeline is not real-time. Signals detected today arrive in the dashboard 30 minutes to 2 hours after the cron fires, depending on Apify queue depth. There is no event-driven architecture — everything polls.

**Vercel Hobby plan: 1 cron, 300s max duration.** The GTM pipeline ingest is piggybacked onto the Reply Engine cron as a fire-and-forget call, not a dedicated scheduled job. Upgrading to Vercel Pro would allow a separate `/api/pipeline/ingest` cron entry and longer function timeouts for processing. On Hobby, any enrichment function that exceeds 300 seconds will be killed mid-run.

**SMTP catch-all domains block individual mailbox confirmation.** Many enterprise Google Workspace domains (and some Microsoft 365 tenants) are configured as catch-all. When catch-all is detected, the email finder returns the most probable permutation as `found: false, verdict: 'unknown'` — which means it is dropped by the pipeline processor's `verdict !== 'valid'` check. These leads will fail with `email_verdict_unknown`.

**Pattern cache starts empty.** On a fresh installation, the `domain_patterns` table has no data. Every domain requires the full SMTP permutation loop on first encounter. Accuracy and speed improve only as emails are found and confirmed over time.

**Company website scraping is heuristic-based.** The contact-finder's Level 2 approach looks for team pages at standard URL paths. Companies with non-standard site structures, JavaScript-rendered team pages, or no public team page at all will not yield contacts at this level.

**Funding headline parsing may miss non-standard formats.** The funding signal parser looks for patterns common in TechCrunch-style funding articles. Announcements written in unusual formats, press release language, or non-English headlines may not parse correctly.

**No dashboard authentication.** The dashboard is currently open — there is no login or session requirement. It should not be deployed on a public URL without adding authentication.

**No cost-per-lead tracking.** Apify credits, Perplexity API tokens, and Anthropic tokens are consumed per lead but not tracked or surfaced in the dashboard. At scale, these costs can add up quickly without visibility.

---

## 12. Roadmap

### Reply Engine V4

- Multi-touch follow-up generation: generate follow-up steps 2 and 3 of a sequence, not just the first email.
- Sentiment classification on inbound replies: categorize as interested, not interested, wrong person, or out-of-office before handing off to the generator.
- Auto-book from positive reply: detect "let's chat" or "book some time" intent and respond with a Calendly link automatically.
- Reply classification routing: route different reply types to different response templates (objection handling vs. meeting confirmation vs. referral request).

### Email Finder V2

- Seed `domain_patterns` from `verification_results`: any verified email in the historical verification table can inform pattern confidence without requiring a live SMTP test.
- LinkedIn scraper actor for direct profile data: replace the Google `site:linkedin.com/in` intermediary with a direct LinkedIn actor to improve contact-finding hit rates.
- Hunter.io fallback: for domains with no cached pattern and SMTP returning ambiguous results, fall back to Hunter.io's domain search before giving up.
- Expose as a standalone API product: the email finder is generic enough to be offered as a paid API endpoint.

### GTM Intelligence Engine V2

- Additional signal sources: G2/Capterra competitor review spikes, Product Hunt launches, Twitter/X hiring signals, Crunchbase direct API for funding data.
- Company size and revenue estimation from LinkedIn during signal ingestion to filter out companies outside the ICP before enrichment.
- Tech stack detection: identify what tools a company uses (from job descriptions, website source) to personalize openers around displacement or integration angles.
- LinkedIn scraper actor for contact finding: eliminate the Google intermediary and query LinkedIn directly for decision-makers by company.
- Auto-scheduling on Vercel Pro: add a dedicated cron for enrichment so the pipeline processes leads overnight without manual dashboard interaction.
- Composite lead score at enrichment stage: combine signal score + email deliverability confidence + company fit score into a single prioritization metric.

### Verification Pipeline V2

- Webhook-based job completion: replace dashboard polling with a callback URL so bulk verification jobs notify ColdCraft when complete.
- Historical bounce lookup before SMTP: check the internal bounce history table before running a live SMTP test on any address — avoids re-verifying known-bad addresses.
- Catch-all bypass via FindyMail: for leads where SMTP catch-all is detected, automatically attempt FindyMail lookup instead of dropping the lead.
- Direct Instantly lead list verification: pull unverified leads from an Instantly campaign via the API, run them through the verification pipeline, and remove undeliverable addresses without a CSV round-trip.

### Infrastructure

- Upgrade to Vercel Pro: dedicated pipeline cron, longer function timeouts, more concurrent serverless invocations.
- Dashboard authentication: add NextAuth or Clerk session management so the dashboard requires login.
- Usage tracking: log Apify credits consumed, Perplexity tokens, and Claude tokens per lead run. Surface cost-per-lead in the dashboard.
- Error alerting: send a Slack or email notification when the pipeline cron fails, an Apify actor times out, or more than N leads fail enrichment in a single run.
- Staging environment: a separate Vercel preview deployment connected to a separate Supabase project for safe testing of pipeline changes.
