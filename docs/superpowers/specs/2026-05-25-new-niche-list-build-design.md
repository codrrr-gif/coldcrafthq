# New-Niche List Build — Retained Recruiters + Specialist B2B Agencies

**Date:** 2026-05-25
**Author:** Matt (brainstormed with Claude via superpowers:brainstorming + coldiq-gtm:list-building)
**Status:** Design approved, pending spec review

---

## Goal

Build two untested ColdCraft outbound niches in parallel using AI Ark as a new contact source, layered on top of the existing signal/score/verify/dedupe waterfall. Two parallel ICPs, four Instantly campaigns (Tier A signal-matched + Tier B firmographic per niche), shared 5-step sequence structure with niche-swap and tier-swap copy.

**Non-goals:** New copy framework. New deliverability infra. Multi-channel (LinkedIn) layer. Tech-stack-gated filtering. Those are V10+ work, not this build.

## Constraints

- **AI Ark credit budget:** ~19,800 credits available as of 2026-05-26 (after user top-up following the Task 5 cost-model discovery). 1 credit per landed verified email (0.5 enrichment + 0.5 BounceBan verification), 0 credits per unfindable contact.
- **`/people` (metadata search) costs 0.5 credits per RECORD RETURNED** (confirmed via `x-credit` header: -0.5 at size=1, -50.0 at size=100). Forecast for two metadata pulls at 5,000 records each = 5,000 credits.
- **Cohort restored to 5,000 per niche** (the original plan). Total forecast spend: 5,000 cr metadata + ~5,000 cr export = ~10,000 cr (~50% of balance), leaving ~10,000 cr buffer for retries and signal scrape costs.
- **Mid-pagination resilience:** the AI Ark client streams each page to disk immediately (via the `onPage` callback). A dropped connection after page N preserves all rows from pages 0..N-1 in the CSV.
- **AI Ark always verifies emails via BounceBan in real time** — there is no `verify_emails: false` toggle. This means MillionVerifier is no longer needed in the pipeline (would be redundant verification spend). Reacher VPS stays in the pipeline for: (a) sanity-rechecking catch-all results, (b) periodic re-verification before send if a list ages >30 days.
- **Geo:** US + Canada (matches AI Ark coverage, top-tier deliverability, single timezone band for sending). Filter syntax: `location: { country: ["United States", "Canada"] }`.
- **Send rules (locked, from V9):** Mon-Fri, 7:00-10:30 AM ET, 30/day per inbox, stop-on-reply, text-only, no link tracking, zero em dashes, zero exclamation marks, spintax format throughout.
- **Decay-fight:** Re-verify any list older than 30 days; this build is fresh so not yet relevant.
- **AI Ark async constraints:** People-search `trackId` expires 6 hours, single-use. Email-finder/export require either a public `webhook` URL or polling via `/inquiries`. This plan uses **polling** (one-shot pull, no recurring webhook infra needed).

## Architecture

```
Stage 1 — METADATA SEARCH (AI Ark /people, 0.5 credits/RECORD)
  ├─ Pull 1: Retained Recruiters (US+CA, ICP-1 filters)  → up to 5,000 metadata records
  └─ Pull 2: Specialist B2B Agencies (US+CA, ICP-2 filters) → up to 5,000 metadata records
     Returns rich profile + company + LinkedIn data. NO emails yet.
     Cost: ~5,000 credits total (10K records × 0.5 cr). Streamed to disk per page.

Stage 2 — SIGNAL ENRICHMENT (existing modules, on metadata only)
  ├─ indeed-jobs scrape: tag company if matching role posted <30d
  └─ Apify LinkedIn headcount: tag if YoY growth threshold met

Stage 3 — SCORE + GATE (composite-scorer + niche_scoring, 100pt matrix per ICP)
  ├─ Tier A: 90-100  (signal-matched)
  ├─ Tier B: 70-89   (firmographic match, no signal)
  └─ Drop:  <70 — DISCARDED, never spends a credit

Stage 4 — COMMIT CREDITS (AI Ark /people/export, ~1 credit per landed email)
  Spend BounceBan-verified email credits ONLY on Tier A + B survivors.
  At 5,099 credit balance, this caps total verified-lead output at ~5,099,
  realistically ~4,000-4,500 after BounceBan miss rate (10-20% no-find typical).
  Job is async — POST /people/export with the same filters, poll
  /people/export/{trackId}/statistics until DONE, then page
  /people/export/{trackId}/inquiries to collect verified emails.

Stage 5 — DEDUPE + SEGMENT (no separate MillionVerifier step)
  ├─ Dedupe vs existing 18,293-lead universe (segment-leads.py pattern)
  ├─ Optional: Reacher VPS spot-check on CATCH_ALL-flagged emails (BounceBan
  │   marks them via output[].domainType — re-verify these for confidence)
  └─ 4 final CSVs → 4 Instantly campaigns:
       • CC-List-RetainedRecruiters-A   (signal-matched, est. 400-700)
       • CC-List-RetainedRecruiters-B   (firmo only,     est. 1,400-1,900)
       • CC-List-SpecialistAgencies-A   (signal-matched, est. 400-700)
       • CC-List-SpecialistAgencies-B   (firmo only,     est. 1,400-1,900)

Stage 6 — LEARN (signal-scoring-feedback, existing loop)
  Tier A vs Tier B reply-rate delta per niche → revises scoring weights
```

### Key design decisions

- **Score-before-credit-spend** is the load-bearing change vs the original "source then verify" waterfall. Because AI Ark always verifies, we spend credits only on leads that already pass the 100pt ICP gate. Drop-tier leads cost zero.
- **Metadata-first iteration is FREE.** We can re-run `/people` with refined filters until we like the cohort before committing to `/people/export`. This is the closest thing AI Ark has to a "dry run."
- **Polling, not webhooks.** One-shot pull; no need to stand up a public webhook endpoint. Poll `/people/export/{trackId}/statistics` every ~30s until `state=DONE`, then page `/inquiries`.
- **Orchestration in `/scripts/campaigns/`** matching existing pattern (`segment-new-niches.py`, `setup-plan-campaigns.py`). No new code paths inside `/src/lib/` beyond the AI Ark client.
- **AI Ark client at `src/lib/sources/ai-ark.ts`** exposes three primitives: `searchCompanies`, `searchPeople` (metadata, no credit cost), `exportPeopleWithEmail` + polling helpers (credit-spending).
- **Tier A and Tier B as separate Instantly campaigns** — not one campaign with variants. Separate campaigns give cleaner reply-rate attribution per cohort, which is the V10 learning signal.

## ICP-1: Retained Executive Search / Recruiters (US+CA)

| Dimension | Filter |
|---|---|
| Industry codes | Staffing & Recruiting, Executive Search, Human Resources Services |
| Excluded | Contingent staffing, RPO, temp agencies, mass-volume recruiters |
| Headcount | 5-75 (sweet spot 10-40) |
| Implied revenue (derived sanity-check, not a filter) | $1M-$25M |
| Geo | US + CA, exclude NYC-only mega-firms |
| Decision-maker titles | Managing Partner, Founder, Founding Partner, Managing Director, President, Practice Lead, VP Business Development |
| Excluded titles | Recruiter, Sourcer, Talent Coordinator, Researcher, Intern |
| Tier-A signal triggers (automated only) | (a) Posting BD / Partner / Director of Business Development role <30d (`indeed-jobs` module), AND/OR (b) +15% headcount YoY (Apify LinkedIn) |

## ICP-2: Specialist B2B Agencies (US+CA)

| Dimension | Filter |
|---|---|
| Agency types (whitelist) | PR, RevOps, lifecycle/CRM, demand-gen specialist, performance/paid media, B2B content, sales enablement, ABM consultancy, fractional CMO firms |
| Excluded | General digital agencies, dev shops, design studios, marketing agencies (already shipped in original 7), branding-only firms |
| Headcount | 5-50 (sweet spot 8-30) |
| Implied revenue (derived sanity-check, not a filter) | $500K-$10M |
| Geo | US + CA |
| Decision-maker titles | Founder, CEO, Managing Director, Managing Partner, Head of New Business, Head of Growth, COO |
| Excluded titles | Account Manager, Account Executive, Strategist, Designer, Copywriter, Coordinator |
| Tier-A signal triggers (automated only) | (a) Posting AE / Account Director / Senior Strategist role <30d (`indeed-jobs` module), AND/OR (b) +20% headcount YoY (Apify LinkedIn) |

## Scoring matrix (100 pts, applied per ICP)

| Component | Max pts | ICP-1: Recruiters | ICP-2: Agencies |
|---|---|---|---|
| Industry match | 25 | Exact recruiting/exec-search code | Whitelisted agency type only |
| Headcount band | 20 | 10-40 = 20, 5-9 or 41-75 = 12, else 0 | 8-30 = 20, 5-7 or 31-50 = 12, else 0 |
| Title seniority | 20 | Founder/MP = 20, MD/President = 15, VP BD = 12, other DM = 8 | Founder/CEO/MD = 20, Head NB/Growth = 15, COO = 10 |
| Geo | 10 | US = 10, CA = 8 | US = 10, CA = 8 |
| Tier-A signal (job post) | 15 | BD/Partner/Dir BD role <30d | AE/AD/Strategist role <30d |
| Tier-A signal (growth) | 10 | +15% YoY headcount | +20% YoY headcount |

**Tier gates (score-based, not signal-count-based):**
- Tier A: 90-100 (in practice, requires both Tier-A signals OR job-post signal + near-max firmographic profile)
- Tier B: 70-89 (firmographic match, with or without partial signal)
- Drop: <70 (fails industry / title / headcount gates)

**Score math sanity-check:**
- Max firmographic-only base: 25 (industry) + 20 (headcount) + 20 (title) + 10 (geo) = 75 → top end of Tier B
- + job-post signal (15) = 90 → Tier A
- + growth signal (10) only = 85 → Tier B
- + both signals (25) = 100 → Tier A

So in practice: a Tier A lead is either (a) firmographically near-perfect AND has the job-post signal, or (b) has both signals on a strong firmographic base. The growth signal alone is a Tier B booster, not a Tier A trigger.

**Expected distribution per niche (per `qualify-accounts` benchmarks):**
- Tier A: ~15-25% of clean leads (~600-1,000)
- Tier B: ~60-70% (~2,400-3,200)
- Drop: ~10-20% (~400-800)

## Sequence-variant strategy

5-step cadence (Day 1, 3, 7, 11, 17), shared structure with `docs/new-niche-campaign-plan.md`. Four sequences total — two angles × two niches.

| Sequence | Tier | Hook angle | Personalization depth |
|---|---|---|---|
| `RetainedRecruiters-A` | A | Reference recent BD/Partner role posting | High — spintax includes role-reference variants |
| `RetainedRecruiters-B` | B | Referral-dependency frame ("80%+ referral, works until a slow quarter") | Standard |
| `SpecialistAgencies-A` | A | Reference recent AE/Strategist hire ("scaling delivery before scaling pipeline") | High — spintax includes hire-reference variants |
| `SpecialistAgencies-B` | B | Specialist-positioning frame (specialist-niche agency pipeline pain) | Standard |

**Rationale:** Tier A's signal-aware opener IS the personalization. Tier B can't credibly use signal language (no signal fired), so it leans on category-level insight. The reply-rate divergence between A and B per niche is what `signal-scoring-feedback` learns from in Stage 6.

**Locked sending rules:** Mon-Fri 7-10:30 AM ET, 30/day, stop-on-reply, text-only, no link tracking, zero em dashes, zero exclamation marks, spintax everywhere.

## File structure

```
/scripts/campaigns/
├── ai-ark-pull-retained-recruiters.py    # new — Stage 1
├── ai-ark-pull-specialist-agencies.py    # new — Stage 1
├── enrich-signals-niche-2026.py          # new — Stage 2
├── score-and-tier-niche-2026.py          # new — Stage 3
├── verify-and-dedupe-niche-2026.py       # new — Stage 4
├── setup-niche-2026-campaigns.py         # new — Stage 5 (campaigns + sequences)
└── push-niche-2026-leads.py              # new — Stage 5 (upload leads)

/src/lib/sources/
└── ai-ark.ts                             # new — AI Ark API client

/data/niche-2026/
├── raw-ai-ark-recruiters.csv             # Stage 1 output
├── raw-ai-ark-agencies.csv               # Stage 1 output
├── signal-enriched-*.csv                 # Stage 2 output
└── scored-*.csv                          # Stage 3 output

/segmented-lists/
├── CC-List-RetainedRecruiters-A.csv      # Stage 4 output (final)
├── CC-List-RetainedRecruiters-B.csv
├── CC-List-SpecialistAgencies-A.csv
└── CC-List-SpecialistAgencies-B.csv
```

Intermediate artifacts in `/data/niche-2026/` are first-class — each stage is rerunnable in isolation for debugging and idempotency.

## Ship checklist

| # | Step | Output | Effort |
|---|---|---|---|
| 1 | Write `src/lib/sources/ai-ark.ts` + smoke test against API | Working API wrapper w/ search + export + polling | 3h |
| 2 | Run `ai-ark-pull-*.py` both niches (Stage 1 metadata search via `/people`) | 2 metadata CSVs (~5K each, no emails, 0 credit spend) | 1h |
| 3 | Run `enrich-signals-niche-2026.py` | signal-tagged metadata CSVs | 3h (scraper-bound) |
| 4 | Run `score-and-tier-niche-2026.py` with new ICP configs | 4 tiered metadata CSVs (Tier A + B per niche) | 1h |
| 5 | Run `aiark-export-and-poll-niche-2026.py` (Stage 4 credit spend) | 4 verified-email CSVs from BounceBan; credit-balance audit | 2-4h (async, polling-bound) |
| 6 | Run `dedupe-niche-2026.py` (no MillionVerifier needed) | 4 dedupe-cleaned final CSVs in `/segmented-lists/` | 30m |
| 7 | Write 4 sequences (validate spintax, no em dashes, no exclamations) | sequence JSONs | 4h |
| 8 | Run `setup-niche-2026-campaigns.py` | 4 Instantly campaigns created | 30m |
| 9 | Run `push-niche-2026-leads.py` | leads attached, campaigns paused | 30m |
| 10 | Manual QA: spot-check 10 leads/campaign, 2 test sends | Pass | 30m |
| 11 | Unpause campaigns | Live sending | 5m |

**Total active effort:** ~16-18h, spread across 3-4 calendar days (async scraper + AI Ark polling runtimes).

**Learning loop activates Day 7-10** after first reply data lands, via `signal-scoring-feedback` Tier A vs B comparison per niche.

## Open questions for implementation phase

These get resolved when writing-plans runs, not here:

- Whether the 5,099 credit balance is the true ceiling or whether the user can top up to the originally-assumed 10K before Stage 4. (User confirmed proceeding with 5K.)
- Whether `composite-scorer.ts` currently accepts dynamic ICP config or needs a new niche-config loader (likely the latter — to verify by reading `src/lib/pipeline/composite-scorer.ts`).
- Specific Apify actors for LinkedIn headcount-delta enrichment (which one your `signals/utils.ts` is already wired to).
- Whether `signal-scoring-feedback` reads campaign-tagged tiers automatically or needs the Tier A/B distinction passed explicitly.
- Polling cadence for `/people/export/{trackId}/statistics` — start at 30s, back off if rate-limited (5 req/s observed limit).

## Out of scope

- LinkedIn DM / multi-channel layer (V10 future work)
- Reverse-sync attribution changes (existing system already handles this)
- New deliverability infra
- Sequence-variant A/B testing within a tier (separate from Tier A vs B cohort comparison)
- Anything beyond Instantly campaign launch
