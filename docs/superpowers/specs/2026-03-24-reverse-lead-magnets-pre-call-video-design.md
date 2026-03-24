# Reverse Lead Magnets + Pre-Call Video — Design Spec
**Date:** 2026-03-24
**Project:** ColdCraft HQ
**Status:** Approved

---

## Overview

Two categories of business assets to increase pipeline and close rate:

1. **Three reverse lead magnets** — micro SaaS audit tools, one per ICP vertical, embedded in the existing ColdCraft Next.js app. Used as cold email assets: the cold email offers to "send the results," prospect replies yes, gets a pre-filled link, lands on the branded tool.

2. **One pre-call video script** — Anthropic-style screen-recording + AI voiceover (no talking head). Sent 24 hours before a strategy call. Handles top objections, demonstrates the system, primes the prospect to buy. Produced by Matt using ScreenStudio + ElevenLabs + Descript.

---

## Context

- **Business:** ColdCraft HQ — B2B cold email agency, "Your pipeline, engineered"
- **Stack:** Next.js (App Router), Supabase, Vercel, Anthropic API (`claude-sonnet-4-6`)
- **ICP segments:** Series A SaaS, marketing agencies, IT services firms
- **No clients yet** — social proof uses live tool demo, not testimonials
- **Inspiration:** Lead Gen Jay's "reverse lead magnet" — pre-filled micro SaaS apps that do work FOR the prospect before they reply

---

## Asset 1A — Agency Outbound Health Auditor

**URL:** `coldcrafthq.com/audit/agency?domain=PREFILLED`
**Target:** Marketing agencies running cold outbound
**Cold email hook:** *"I ran [domain] through our auditor — found 3 issues killing your reply rate. Want the report?"*

### What it does
1. User arrives with `?domain=` pre-filled (or enters manually)
2. App performs live DNS lookups: SPF record, DKIM record (`_domainkey` TXT), DMARC policy
3. Checks domain against Spamhaus ZEN blacklist via DNS
4. Calculates deliverability health score (0–100) across 5 factors:
   - SPF configuration (pass=20 / softfail=10 / fail/missing=0)
   - DKIM presence (present=20 / missing=0)
   - DMARC policy strength (reject=20 / quarantine=15 / none=5 / missing=0)
   - Blacklist status (clean=20 / listed=0)
   - Sending domain age proxy: check if MX record exists and if domain has been seen (pass/fail, 20/10)
5. Claude generates 3 ranked fix recommendations based on actual findings (not generic)
6. Email capture gate reveals full results

### Technical approach — Agency route

**Domain validation:**
```
strip protocol/path → lowercase → validate against /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63})*\.[a-zA-Z]{2,}$/
```
Rejects consecutive dots, labels starting/ending with hyphens, and labels > 63 chars (RFC 1123 compliant).

**DNS lookups:**
- Primary: `https://dns.google/resolve?name={name}&type={type}`
- Fallback: `https://1.1.1.1/dns-query?name={name}&type=A` (Cloudflare DoH)
- If both fail, mark that factor as "unable to check" (score 0 for that factor, noted in results)

**result_json stored in audit_results:**
```json
{
  "score": 65,
  "factors": {
    "spf": { "score": 20, "value": "v=spf1 include:...", "status": "pass" },
    "dkim": { "score": 0, "status": "missing" },
    "dmarc": { "score": 5, "policy": "none" },
    "blacklist": { "score": 20, "status": "clean" },
    "mx": { "score": 20, "status": "present" }
  },
  "recommendations": ["...", "...", "..."],
  "summary": "one-sentence Claude summary"
}
```
Raw DNS response text is NOT stored. Only processed fields above.

---

## Asset 1B — Series A SaaS Pipeline Gap Calculator

**URL:** `coldcrafthq.com/audit/saas`
**Target:** Series A SaaS without a repeatable outbound motion
**Cold email hook:** *"Based on [Company]'s stage and ACV, you're ~[X] meetings short of your ARR target. Want the breakdown?"*

### What it does
1. Multi-step form (3 steps):
   - Step 1: `arr_target` (next 12mo), `current_arr`, `funding_stage` (pre-seed/seed/series-a/series-b+)
   - Step 2: `acv` (average contract value), `meetings_per_month` (current), `meeting_to_close_rate` (%)
   - Step 3: `sales_team_size` (number of people doing sales, including founders)
2. Client-side math calculates:
   - `meetings_needed = (arr_target - current_arr) / acv / meeting_to_close_rate`
   - `pipeline_gap = meetings_needed - meetings_per_month * 12` (annual gap)
   - `monthly_gap = pipeline_gap / 12`
   - `cost_of_inaction_monthly = monthly_gap * acv * meeting_to_close_rate`
   - `coldcraft_projected_meetings_conservative = 20` (static floor — can tune later)
   - `coldcraft_roi = (coldcraft_projected_meetings_conservative * acv * meeting_to_close_rate) / estimated_coldcraft_cost`
3. Summary numbers shown immediately to user (no gate on these)
4. Claude commentary (3 sentences: diagnosis, root cause, fix) generated server-side — gated behind email
5. Email capture gate

**`saas_inputs` stored on `audit_leads`:**
```json
{
  "arr_target": 2000000,
  "current_arr": 400000,
  "funding_stage": "series-a",
  "acv": 24000,
  "meetings_per_month": 4,
  "meeting_to_close_rate": 0.20,
  "sales_team_size": 2
}
```

**`input_key` for caching:** SHA-256 of JSON.stringify of inputs object with keys sorted alphabetically.

---

## Asset 1C — IT Services Outbound Readiness Scorer

**URL:** `coldcrafthq.com/audit/it-services?url=PREFILLED`
**Target:** IT services firms relying on referrals, no cold outbound
**Cold email hook:** *"Scored [Company] on outbound readiness — [X]/100, messaging clarity is your biggest blocker. Want the scorecard?"*

### What it does
1. User arrives with `?url=` pre-filled (or enters manually)
2. Server fetches and parses their homepage
3. Claude scores across 5 dimensions (0–20 each, total 0–100):
   - **Messaging clarity** — is the value prop immediately clear on homepage?
   - **ICP specificity** — do they name exactly who they serve?
   - **Offer sharpness** — is there a specific, tangible deliverable?
   - **Social proof** — logos, case studies, client names present?
   - **CTA quality** — is there a clear, specific next step?
4. Returns total score, per-dimension scores, and top 3 ranked improvements
5. Email capture gate

### Technical approach — IT Services route

**URL validation (block SSRF):**
```typescript
// Step 1: String-level check
const parsed = new URL(url);
if (!['http:', 'https:'].includes(parsed.protocol)) throw error;

// Step 2: DNS pre-resolution — resolve hostname to IP before fetching
const dnsRes = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`);
const ip = dnsRes.json().Answer?.[0]?.data;
assertNotPrivateIP(ip); // throws if private

// Step 3: assertNotPrivateIP checks ALL of:
// IPv4: 10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x, 0.0.0.0/8
// IPv6: ::1, ::ffff:0:0/96, fc00::/7, fe80::/10, 2002::/16
// Note: covers DNS rebinding — IP checked post-resolution, not pre
```

**Fetch constraints:**
- `AbortSignal.timeout(5000)` (5s)
- Read max 500KB, abort if Content-Length > 500000
- Content-Type must start with `text/html` (check before reading body)
- Install `cheerio` (new dependency: `npm install cheerio`)

**result_json stored in audit_results:**
```json
{
  "score": 52,
  "dimensions": {
    "messaging_clarity": { "score": 8, "note": "Value prop buried below fold" },
    "icp_specificity": { "score": 14, "note": "Names SMBs but not vertical" },
    "offer_sharpness": { "score": 6, "note": "No specific deliverable mentioned" },
    "social_proof": { "score": 16, "note": "3 client logos visible" },
    "cta_quality": { "score": 8, "note": "Contact form only, no specific offer CTA" }
  },
  "improvements": ["...", "...", "..."],
  "summary": "one-sentence Claude summary"
}
```
Raw scraped HTML/text is NOT stored in result_json. Claude prompt uses it; result stores only scores/notes.

**Vercel function config (IT Services only):**
```ts
export const maxDuration = 60; // fetch + cheerio + Claude can approach 30s on slow pages
export const runtime = 'nodejs';
```

---

## Shared Infrastructure

### Email gate — server-side flow

**Token security note:** `result_token` is `audit_results.id` (UUIDv4, 122 bits of entropy). Brute-forcing is not a practical attack. A guessed valid UUID returns only the result_json (no PII — no emails are in audit_results). This is an accepted risk for a B2B lead tool. If requirements change to protect result_json, add a separate `access_token` column with a separate secret.

```
POST /api/audit/agency         (or /saas, /it-services)
  → validate inputs
  → check rate limit (see below)
  → check 24h cache (audit_results by input_key + vertical, where expires_at > now())
    → cache hit: use existing result_id, skip Claude call
    → cache miss: run analysis, store in audit_results
  → return { result_token: uuid, summary: { score, vertical } }  ← NO full results yet

(client shows blurred results + email form)

POST /api/audit/agency/unlock  (or /saas/unlock, /it-services/unlock)
  → validate result_token: query audit_results where id = token AND expires_at > now()
    → not found or expired: return 404
  → validate email: format check + mailchecker (already in package.json) for disposable domains
  → check audit_leads for existing row matching (email + result_id)
    → exists: return cached result_json from audit_results row (no duplicate lead stored)
    → new: insert audit_leads row, send Slack notification
  → return full result_json from audit_results
```

### Rate limiting — Supabase-backed

New table (see migration below). Use Vercel's `request.ip` (trusted, not `x-forwarded-for` manual parse).

```
On each POST to /api/audit/*:
  UPSERT into rate_limit_buckets (ip_hash, endpoint, window_start=date_trunc('hour', now()))
    increment request_count
  If request_count > limit for this endpoint → return 429
```

Per-endpoint limits (separate env vars):
```
AUDIT_RATE_LIMIT_AGENCY=10    # per IP per hour
AUDIT_RATE_LIMIT_SAAS=20      # per IP per hour
AUDIT_RATE_LIMIT_IT=10        # per IP per hour
```

### Supabase migration (migration-v7-audit-tools.sql)

```sql
-- Computed audit results (before email capture)
create table audit_results (
  id uuid primary key default gen_random_uuid(),
  vertical text not null check (vertical in ('agency', 'saas', 'it-services')),
  input_key text not null,  -- lowercase domain (agency/it), SHA-256 of sorted inputs JSON (saas)
  score integer not null,
  result_json jsonb not null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);
create index on audit_results (vertical, input_key, expires_at);

-- Captured leads (email submitted to unlock)
create table audit_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  vertical text not null check (vertical in ('agency', 'saas', 'it-services')),
  result_id uuid not null references audit_results(id) on delete cascade,
  domain_or_url text,          -- agency: domain, it-services: url, saas: null
  saas_inputs jsonb,           -- saas only; null for agency/it-services
  score integer not null,
  created_at timestamptz not null default now(),
  unique (email, result_id)    -- prevents duplicate leads + Slack pings on concurrent unlock requests
);
create index on audit_leads (email, result_id);
-- Unlock handler: use INSERT ... ON CONFLICT (email, result_id) DO NOTHING, then return result_json
-- regardless of whether insert succeeded (idempotent)

-- Rate limiting buckets
create table rate_limit_buckets (
  ip_hash text not null,       -- SHA-256 of IP (avoid storing raw IPs)
  endpoint text not null,      -- 'agency' | 'saas' | 'it-services'
  window_start timestamptz not null,
  request_count integer not null default 1,
  primary key (ip_hash, endpoint, window_start)
);

-- RLS: all tables are server-side only, no client access
alter table audit_results enable row level security;
alter table audit_leads enable row level security;
alter table rate_limit_buckets enable row level security;
-- No RLS policies needed — all access via service role key in API routes

-- Cleanup: delete expired audit_results and old rate limit buckets
-- Run via Supabase cron (pg_cron) or periodic serverless function
create or replace function cleanup_audit_data() returns void language sql as $$
  delete from audit_results where expires_at < now();
  delete from rate_limit_buckets where window_start < now() - interval '2 hours';
$$;
```

### Design system
- Dark theme, ColdCraft brand colors
- Geist Sans / Geist Mono (already in project)
- shadcn/ui: Card, Progress, Badge, Button, Input, Form (already installed)
- Animated score reveal (count-up on results)
- Mobile-responsive

### Analytics & pixels
- `src/app/audit/layout.tsx` — **Server Component** (not `'use client'`); uses `next/script` for GA4 + Meta Pixel
- Scoped to `/audit/*` only, not the full app
- GA4 custom events (fired client-side after gate): `audit_started`, `audit_completed`, `email_captured`, `cta_clicked`
- Meta Pixel fires `Lead` event on email capture
- Cookie notice: minimal banner in audit layout (text + dismiss button, no preference storage needed for B2B)
- New env vars:
  ```
  NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
  NEXT_PUBLIC_META_PIXEL_ID=XXXXXXXXXXXXXXXXX
  ```

### New dependencies
```bash
npm install cheerio  # IT Services HTML parsing — not currently in package.json
```
`mailchecker` — already in `package.json`, import directly.

### Vercel function config
All six API routes (`/api/audit/*/route.ts` and `/api/audit/*/unlock/route.ts`) must explicitly export:
```ts
export const runtime = 'nodejs'; // required on ALL routes — Edge runtime lacks dns and cheerio
export const maxDuration = 30;   // default for agency, saas, and all unlock routes
```
IT Services `/api/audit/it-services/route.ts` only overrides duration:
```ts
export const runtime = 'nodejs';
export const maxDuration = 60;   // URL fetch + cheerio + Claude can approach 30s
```

### Routes
```
src/app/audit/
  layout.tsx                    Server Component, GA4 + Meta Pixel, cookie notice
  agency/page.tsx               Agency Auditor (Client Component)
  saas/page.tsx                 SaaS Calculator (Client Component)
  it-services/page.tsx          IT Services Scorer (Client Component)

src/app/api/audit/
  agency/
    route.ts                    POST — run audit, return token
    unlock/route.ts             POST — validate token + email, return results
  saas/
    route.ts                    POST — run commentary, return token
    unlock/route.ts             POST — validate token + email, return results
  it-services/
    route.ts                    POST — fetch + score, return token
    unlock/route.ts             POST — validate token + email, return results

src/lib/audit/
  rate-limit.ts                 IP rate limiting via Supabase
  safe-fetch.ts                 SSRF-safe URL fetcher (DNS pre-resolve + IP blocklist)
  dns.ts                        DNS-over-HTTPS helpers (Google + Cloudflare fallback)
  email-gate.ts                 Shared token create/validate/unlock logic
```

---

## Asset 2 — Pre-Call Video Script

**Format:** Screen recording (ScreenStudio) + AI voiceover (ElevenLabs) + assembly (Descript)
**Length:** 6–8 minutes
**Delivery:** Email link sent 24 hours before strategy call

### Full Script

---

**[SECTION 1 — HOOK: 0:00–0:20]**
*Screen: ColdCraft logo or clean dark background*

> "Before our call tomorrow — I want to give you three things that'll make the next 30 minutes 10 times more valuable. This takes about 7 minutes. Watch it."

---

**[SECTION 2 — THE REAL PROBLEM: 0:20–2:00]**
*Screen: animated pipeline math — show 1% reply rate → meetings → revenue*

> "Most companies trying to build outbound make the same mistake. They hire an SDR, buy a list from Apollo, write a few emails, and wonder why nothing converts. Then they conclude that cold email is dead.
>
> It's not dead. It's broken for most people. And here's why.
>
> At a 1% reply rate — which is industry average — you need to send 10,000 emails to get 100 replies. At those numbers, cold outbound looks like luck. You can't build a business on luck.
>
> At 4% — which is what a properly engineered system delivers — 10,000 emails gets you 400 replies. Same effort. Four times the pipeline. The difference isn't the list or the copy. It's the engineering underneath."

---

**[SECTION 3 — COLDCRAFT'S SYSTEM: 2:00–3:30]**
*Screen: animated 5-layer diagram, each layer revealed as voiceover hits it*

> "This is what we build. Five layers.
>
> Layer one: Infrastructure. Dedicated sending domains, properly warmed mailboxes, DNS authentication — SPF, DKIM, DMARC — configured correctly. This is why most cold email dies before anyone reads it. Your emails never land in the inbox.
>
> Layer two: List precision. ICP-mapped, triple-verified data with sub-2% bounce rates. You don't need a bigger list. You need the right 500 people.
>
> Layer three: Copy. Specialist-written, not templated, A/B tested from day one. Every word earns its place.
>
> Layer four: Sequence logic. Timing, follow-up cadence, reply handling. Most people stop at email one. The meeting is usually in email three.
>
> Layer five: The feedback loop. AI classifies every reply, tracks what worked and what didn't, and the system gets sharper with every campaign."

---

**[SECTION 4 — LIVE DEMO: 3:30–4:30]**
*Screen: open the Agency Auditor at coldcrafthq.com/audit/agency, type in a real domain, watch it run*

> "Here's a quick example of what layer one looks like in practice.
>
> [type domain] — I'm running an audit on this agency's outbound infrastructure right now. Watch what comes back.
>
> [results appear] Two issues. No DKIM record configured — that means their emails are landing in spam before anyone reads them. And their DMARC policy is set to none — which means they have zero protection against spoofing.
>
> These are fixable in an afternoon. But most agencies have been running broken infrastructure for months. This is the audit we'll run on your setup on tomorrow's call."

---

**[SECTION 5 — OBJECTION CRUSHING: 4:30–6:00]**
*Screen: clean text slides, one objection at a time*

> **"I've tried cold email before and it didn't work."**
> "You tried cold email with broken infrastructure and a generic message. That's not the same thing as a properly engineered system. What you watched in that demo — that's what most people are running blind."
>
> **"How do I know this works for our specific ICP?"**
> "It works when two conditions are true: your ICP is specific enough to target precisely, and your offer is clear enough to make someone reply yes. That's exactly what we figure out on tomorrow's call. If either of those is off, we'll tell you that, too."
>
> **"What's the time commitment / how long until we see results?"**
> "Infrastructure is built in weeks one and two. You typically see first replies in week three. First meetings by week four. After that the system runs — you don't manage campaigns, you manage the calendar."

---

**[SECTION 6 — WHAT TO EXPECT ON THE CALL: 6:00–6:40]**
*Screen: simple three-point list*

> "Tomorrow we're covering three things.
>
> One: We'll map your ICP precisely — who exactly we're targeting, what signal tells us they're ready to buy.
>
> Two: We'll audit your current outbound setup — or if you haven't started yet, we'll build the architecture from scratch on the call.
>
> Three: I'll walk you through exactly what a ColdCraft engagement looks like and what it costs.
>
> Come with your biggest pipeline bottleneck in mind. We'll work backwards from there."

---

**[SECTION 7 — CTA: 6:40–7:00]**
*Screen: calendar link visible*

> "If you need to reschedule, the link is in the original email. Otherwise — see you tomorrow."

---

## Build Order

1. `migration-v7-audit-tools.sql` — create tables in Supabase
2. `src/lib/audit/` shared utilities (rate-limit, safe-fetch, dns, email-gate)
3. `src/app/audit/layout.tsx` — shared layout with pixels + cookie notice
4. Agency Auditor (most complex: DNS logic + blacklist checks)
5. SaaS Pipeline Calculator (simplest: client math + Claude commentary)
6. IT Services Scorer (Claude-heavy: URL fetch + scoring)
7. Pre-call video script delivered — ready for Matt to produce in ScreenStudio + ElevenLabs

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Audit completion rate | >60% |
| Email capture rate (of completions) | >40% |
| Captured lead → booked call | >15% |
| Pre-call video watch rate | >70% |
| Show rate (with video sent) | >85% vs. baseline without video |
