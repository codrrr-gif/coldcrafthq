# Niche-2026 Launch Notes

Status as of `feature/niche-2026-list` HEAD. This doc is the handoff for picking up the remaining tasks after the AI Ark export-single job completes.

---

## State (final — 2026-05-27)

**Branch:** `feature/niche-2026-list`

**What's complete:**
- Tasks 1-9 ✅ (spec, plan, AI Ark client + CLI, 14K metadata records, scoring, 4 tier CSVs)
- Task 10 + 10b + 10c ✅ — three export passes, **8,460 verified BounceBan-VALID emails** on disk
- Task 11 ✅ (4 sequence JSONs authored, validated against locked rules)
- Task 12 ⏸ ready to run, sending-account pools need to be filled in first
- Tasks 13 + 14 ⏸ done inside Task 12's script + manual unpause

**Final verified counts (in `/segmented-lists/`):**

| File | Verified emails |
|---|---|
| CC-List-RetainedRecruiters-A.csv | 1,265 |
| CC-List-RetainedRecruiters-B.csv | 2,739 |
| CC-List-SpecialistAgencies-A.csv | 210 |
| CC-List-SpecialistAgencies-B.csv | 4,246 |
| **Total** | **8,460** |

**Why we stopped at 8,460 vs the 10K target:** AI Ark's deeper-page records (50+) had a ~35% BounceBan find rate vs ~85% on the top pages. The third export pass added only 1,181 finds for 1,257cr. At those margins, the next ~1,500 finds would have needed ~3,800cr (exceeded the remaining 2,235cr balance). Stopped to preserve buffer for V10 follow-ups.

**Credit ledger (full):**
- Started: 5,099 (Task 4 baseline)
- After Task 4 probing: 5,079
- After top-up: 19,829
- After Stage 1 metadata pulls (10K records): 12,879
- After Task 10 export (initial 5,190): 8,393
- After Task 10b expansion 1 (widen Tier B to score 30): 5,492
- After Task 10c expansion 2 (4K new metadata + export): **2,235**
- Total session burn: **17,594 credits**
- Per-final-lead cost: **2.08 credits**
- AI Ark credit endpoint: `/api/developer-portal/v1/payments/credits`

---

## How to resume Task 10 if it died mid-run

The TS orchestrator is fully resumable. If you see a process crash or hit Ctrl-C:

```bash
cd ~/Documents/coldcrafthq
set -a && source .env.prod && set +a
npx tsx scripts/campaigns/aiark-export-single-niche-2026.ts
```

It will:
1. Read each `data/niche-2026/scored-*.csv`
2. For each output `segmented-lists/CC-List-*.csv`, build a set of already-processed `aiark_person_id`s
3. Skip those (already paid for) and only call AI Ark on the rest
4. Append new rows to the same CSV (resumable cleanly)

Pre-flight aborts if forecast > 90% of credit balance.

---

## Task 12: Create 4 Instantly campaigns (BLOCKED on sending accounts)

The setup script is `scripts/campaigns/setup-niche-2026-campaigns.py`. Before running, **fill in the `accounts` list for each of the 4 campaigns**. The pre-flight gate refuses to start with empty pools.

Each campaign needs its own dedicated pool — do NOT reuse pools from the existing 14 campaigns (it would double-up sends and burn deliverability). Recommend 3 inboxes per campaign on a domain that's currently idle.

Existing pool domains (per `setup-plan-campaigns.py` reference) — **DO NOT reuse these for niche-2026**:
- hicoldcrafthq.com / mycoldcrafthq.com (MktgAgency)
- thecoldcrafthq.com / trycoldcrafthq.com (DesignAgency)
- usecoldcrafthq.com (SaaS)
- withcoldcrafthq.com (DevAgency)

Pick 4 unused domain pools. If none exist, warm fresh ones before Task 12.

Once filled in, run:

```bash
cd ~/Documents/coldcrafthq
python3 scripts/campaigns/setup-niche-2026-campaigns.py
```

This script does Tasks 12 + 13 in one pass:
- Step 1: POST 4 campaigns to Instantly (saves IDs to `niche-2026-campaign-ids.json`)
- Step 2: PATCH settings (V9 lockdown: open_tracking=False, link_tracking=False, text_only=True, 30/day, stop_on_reply, stop_on_auto_reply)
- Step 3: PATCH sequences (5-step from `scripts/campaigns/sequences/niche-2026-sequences.json`)
- Step 4: PATCH email_list (your filled-in account pools)
- Step 5: POST leads from `/segmented-lists/CC-List-*.csv` (5 worker threads via Instantly's `/api/v2/leads` endpoint)

Campaigns are created PAUSED. Task 14 unpauses manually.

---

## Task 14: Manual QA + unpause

For each of the 4 niche-2026 campaigns in Instantly:

1. **Spot-check 10 leads:**
   - Real-looking email, plausible decision-maker title, company is in-niche.
   - Reject ratio target: <10%. Higher → re-filter before unpause.

2. **Send 2 test emails to yourself:**
   - Use Instantly's "Send test" on the Day 1 step, both variants.
   - In the received emails, verify:
     - No em dashes
     - No exclamation marks
     - `{{firstName}}` / `{{companyName}}` / `{{industryNiche}}` / `{{senderFirst}}` all resolve
     - Spintax expanded cleanly (no `{...|...}` blobs visible)

3. **Verify schedule:**
   - Mon-Fri only
   - 07:00-10:30 ET
   - Daily limit: 30
   - Stop on reply: ON
   - Open tracking: OFF
   - Link tracking: OFF
   - Text only: ON

4. **Unpause** all 4 campaigns from the Instantly dashboard. (No script — manual step is the live-send gate.)

5. **Append a launch entry to this doc:**

```markdown
## Launch: 2026-MM-DD

- 4 campaigns unpaused: RetainedRecruiters-A, RetainedRecruiters-B, SpecialistAgencies-A, SpecialistAgencies-B
- Lead counts at unpause: [fill from setup script Step 5 output]
- Sending pool used: [list domains]
- First reply expected by: ~D+3
- Tier-A vs Tier-B reply-rate comparison: scheduled review at D+7-10
```

---

## V10 follow-ups (not in this run)

1. **Signal enrichment for these cohorts**
   - Existing `signal_sources` table + Apify cron pipeline already runs `indeed_jobs` and `expansion_signals` scrapes.
   - Future work: join the niche-2026 metadata (company name + LinkedIn URL) to the existing signals table to identify which Tier B records actually have signals — promote them to "Signal-Match Tier A" cohort.
   - Code lives in `src/lib/signals/indeed-jobs.ts` (parser) and `src/app/api/pipeline/check/route.ts` (cron handler).

2. **Findymail / Reacher cost-optimized verification path**
   - For future runs, consider: AI Ark `/people` for metadata only (0.5cr/record) + Findymail (~$0.05/email) for emails + Reacher VPS for catch-all spot-checks.
   - Existing `FINDYMAIL_API_KEY` in `.env.prod` ready to use.
   - Likely 30-50% cheaper than all-AI-Ark.

3. **Re-pull recruiters with tighter ICP**
   - The Task 5 pull returned ~6K universe; Task 9 scored Tier A = 1,310 (26%). Could tighten the Sales Navigator filters to require Founder/Managing Partner/Founding Partner only (drop Practice Lead + VP BD) for a smaller, higher-quality cohort.

4. **Add reverse-sync attribution for niche-2026 campaigns**
   - The existing CRM reverse-sync (V8) should pick these up automatically by campaign name match. Verify after first wave of replies.

---

## Instantly quirks worth knowing

**"Send test" preview collapses paragraphs.** When you use Instantly's "Send test"
feature to email yourself a sequence step, the rendered email appears as a single
wall of text — `\n\n` paragraph breaks get stripped by the preview pipeline.
**This does NOT happen on real deliveries to prospects.** Real sends use
`text/plain` MIME with newlines preserved; the preview renders as HTML where
whitespace collapses.

Confirmed during niche-2026 launch on 2026-05-27. A real delivered email from
an active production campaign (CC-HR-RPO equivalent) shows perfectly-structured
paragraphs. The test-send to the same address from the same campaign shows the
wall-of-text rendering.

**Lesson:** trust the data shape in `get_campaign` (where you can see the
actual `\n\n` separators) over the test-send preview. The data is what
prospects receive.

**Spintax syntax: Instantly's `{{RANDOM |a|b|c}}` form, NOT standard `{a|b|c}`.**
Standard spintax renders as literal text in delivered emails. Documented at
https://help.instantly.ai/en/articles/6384663-how-to-use-spintax. The transform
script at `scripts/campaigns/fix-spintax-syntax.py` converts between the two.

**Custom variables MUST go inside `custom_variables` object on each lead.**
Top-level non-standard fields (e.g., `industryNiche` at the lead root) are
silently dropped. The `{{industryNiche}}` template variable will render as
literal `{{industryNiche}}` in the email body if you make this mistake.
The fixed MCP at `mcp-servers/instantly.ts` auto-wraps unknown fields into
`custom_variables` to prevent this.

**Timezone enum:** `America/Detroit` is accepted, `America/New_York` returns
400 from the API. Use Detroit for ET-aligned schedules.

**Days are integer keys 0-6 (Sun-Sat),** not day-name strings (`monday`/etc.).
The API will reject day-name keys.

---

## Architecture notes (for future debugging)

**AI Ark API gotchas — documented in `docs/niche-2026/ai-ark-api-notes.md`:**

1. Filter shape is nested `industries.any.include.{mode,content}` — NOT bare arrays. Bare-array form returns `400 "request not readable"`.
2. Title filter is at `contact.experience.latest.title`, NOT `contact.current_position.titles`.
3. `/people` charges **0.5 credits per RECORD RETURNED** (not per call). Plan for 0.005cr per record at size=100.
4. `/people/export/single` charges **1 credit per successful find** (0 on 404). p99 latency 30-60s.
5. ECONNRESET / "fetch failed" / "terminated" / "EPIPE" are all common transient errors. The client retries 3 times with exponential backoff (500ms / 1500ms / 4000ms).
6. Rate limit: 5 req/s, 300/min, 18,000/hour. The export-single orchestrator runs 5 concurrent workers which naturally paces under the limit.

**Branch commits (in order):**

```
8c48cf5 docs: spec + plan
83b0a52 docs: capture AI Ark API contract
3ab473c docs: revise spec + plan for real AI Ark contract
279013c feat(sources): add AI Ark client
2d5ae08 feat(campaigns): add ai-ark-cli
8a404a2 fix(sources): correct schema + throttle
4084255 fix(sources): correct cost model + stream pages to disk
7223a54 feat(sources): retry + resume; recruiters metadata complete
60c4e0a feat(sources): full retry wrap + arg fix; agencies metadata complete
3e4ec95 feat(campaigns): niche scoring + tier-split
40541d4 feat(sources): exportPersonSingle primitive
9a121ee feat(campaigns): 4 niche-2026 sequence JSONs
65a3045 feat(campaigns): TS orchestrator + setup script
4ee7af3 perf(export): 5-worker concurrency + 60s timeout
```
