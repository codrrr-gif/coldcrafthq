# PR: New-niche list build — retained recruiters + specialist agencies

Builds two new outbound cohorts (retained executive-search recruiters + specialist B2B agencies, US+CA) via a new AI Ark integration, signal-friendly scoring module, and 4 Instantly campaigns. Ships ready-to-launch CSVs into `/segmented-lists/` and a paused-campaign setup script.

## Summary

- Two parallel ICPs sourced from AI Ark `/people` (10K metadata records pulled)
- Niche-scored via a new pure-Python 100pt firmographic matrix
- Tier-split into 4 cohorts (A/B per niche) — verified-email export via AI Ark `/people/export/single` (BounceBan-verified)
- 4 sequence JSONs (5 steps each, zero em dashes / zero exclamations / spintax / V9 schedule)
- 4 paused Instantly campaigns created via `setup-niche-2026-campaigns.py` (run after filling in sending pools)

## What's new

### TypeScript
- `src/lib/sources/ai-ark.ts` — full AI Ark client (6 endpoints: getCredits, searchPeople, searchCompanies, exportPeopleWithEmail, exportPersonSingle, getExportStatistics, getExportInquiries)
  - X-TOKEN auth, retry-on-transient (ECONNRESET / "fetch failed" / "terminated" / EPIPE / 5xx / 429)
  - Streaming-to-disk via onPage callback
  - Page-offset resume support (`params.page` as start)
  - Per-endpoint timeouts (15-60s)
- `src/lib/sources/__tests__/ai-ark.test.ts` — 8 vitest tests (auth header, pagination, error surfacing, retry-exhaustion)

### Python orchestration
- `scripts/campaigns/lib/niche_scoring.py` — pure-Python 100pt scorer + tier gates
- `scripts/campaigns/test_niche_scoring.py` — 18 pytest tests
- `scripts/campaigns/ai-ark-pull-{retained-recruiters,specialist-agencies}.py` — Stage 1 metadata pulls
- `scripts/campaigns/score-and-tier-niche-2026.py` — Stage 2/3 scoring + tier-split
- `scripts/campaigns/aiark-export-single-niche-2026.ts` — Stage 4 concurrent (5-worker) email export
- `scripts/campaigns/setup-niche-2026-campaigns.py` — Stage 5 Instantly campaign setup + lead push

### CLI wrapper
- `scripts/campaigns/ai-ark-cli.ts` — 6 commands (credits / search-people / export-people / export-single / poll-export / fetch-export). Bare-flag arg parser. Streams page-by-page to disk.

### Sequences
- `scripts/campaigns/sequences/niche-2026-sequences.json` — 4 campaign sequences × 5 steps × tier-specific Day 1 variants

### Specs + plan
- `docs/superpowers/specs/2026-05-25-new-niche-list-build-design.md`
- `docs/superpowers/plans/2026-05-26-new-niche-list-build.md`
- `docs/niche-2026/ai-ark-api-notes.md` — empirical API contract documentation
- `docs/niche-2026/LAUNCH-NOTES.md` — runbook for completing Tasks 12-14

## API contract corrections vs initial discovery

Task 1's initial discovery had three inaccuracies that surfaced during the live runs:

1. `/people` filter shape is **nested** (`industries.any.include.{mode,content}`), NOT bare arrays
2. Title filter lives at `contact.experience.latest.title`, NOT `contact.current_position.titles`
3. `/people` charges **0.5 credits per record** returned, NOT per call (the small-`size` probes hid this)

All corrections documented in `docs/niche-2026/ai-ark-api-notes.md` and reflected in the client + params.

## Cohort outcomes

Scored 14,000 metadata records total (7K recruiters + 7K agencies, two passes of metadata pulls). Three export passes against progressively-widened tier thresholds (50 → 30 → 30 with new metadata).

| Niche | Tier A | Tier B (score 30+) | Drop | Final verified |
|---|---|---|---|---|
| Retained Recruiters | 1,825 (26%) | 4,809 (69%) | 366 (5%) | **4,004** (1,265 A + 2,739 B) |
| Specialist Agencies | 269 (4%) | 6,261 (89%) | 470 (7%) | **4,456** (210 A + 4,246 B) |
| **TOTAL** | **2,094** | **11,070** | **836** | **8,460 verified emails** |

Agency Tier A is small because AI Ark records often lack parsable headcount, capping firmo scores at 50. Future: tighten the metadata pull params + use signal enrichment to lift Tier A counts.

**Find rate observations across the runs:**
- Top firmographic (Tier A, score 65+): ~85% find rate
- Middle firmographic (Tier B, score 50-64): ~80% find rate
- Expansion 1 (Tier B widened to score 30-49 on top pages): ~70% find rate
- Expansion 2 (new metadata pages 50-69, all scores): ~35% find rate

The find-rate cliff between top pages (0-49) and deeper pages (50+) is the load-bearing reason we shipped at 8,460 instead of the 10K stretch target.

## Credit ledger

- Starting balance: 5,099 (after Task 4 baseline probing)
- User top-up: +14,750 → 19,829
- Stage 1 metadata pulls (10K records, Tasks 5-6): ~6,950cr
- Stage 4 initial export (5,190 survivors at score 50+, Task 10): 4,322cr
- Stage 4b expansion 1 (3,428 records at score 30-49, Task 10b): 2,901cr
- Stage 4c metadata expansion + export (4K more metadata + 5,500 new survivors, Task 10c): 3,257cr
- **Final balance: 2,235cr (11% buffer for V10 follow-ups)**
- **Per-final-lead cost: 2.08cr** (full pipeline cost amortized across 8,460 verified leads)

## Tradeoffs taken

- **Task 7 (signal enrichment) skipped** — existing signal infra is background-pipeline based with no on-demand per-company CLI. Scoring is firmographic-only this run with adjusted tier gates (A: 65+, B: 50-64). Promoted to V10 follow-up.
- **AI Ark single-source for emails** — kept the plan simple. Findymail/Reacher hybrid pipeline left as a V10 cost-optimization follow-up.

## How to launch (Tasks 12-14)

1. Fill in `accounts` in `scripts/campaigns/setup-niche-2026-campaigns.py` with 4 dedicated unused inbox pools (3 inboxes each)
2. Run `python3 scripts/campaigns/setup-niche-2026-campaigns.py`
3. Manual QA per `LAUNCH-NOTES.md` (spot-check 10 leads/campaign, send test emails)
4. Unpause from the Instantly dashboard

## Test plan

- [x] AI Ark client: 8 vitest tests pass (`npx --yes -p vitest@^1 vitest run src/lib/sources/__tests__/ai-ark.test.ts`)
- [x] Niche scoring: 18 pytest tests pass (`cd scripts/campaigns && python3 -m pytest test_niche_scoring.py -v`)
- [x] TypeScript clean: `npx tsc --noEmit scripts/campaigns/aiark-export-single-niche-2026.ts scripts/campaigns/ai-ark-cli.ts src/lib/sources/ai-ark.ts`
- [x] Live smoke tests against AI Ark: credits read, /people search at size=5, /people/export/single on a known-good record
- [x] Stage 1 + Stage 2 + Stage 3 ran end-to-end against live API
- [ ] Task 10 (Stage 4 export) — in progress at PR-author time
- [ ] Tasks 12-14 — blocked on sending account pool selection (manual)
