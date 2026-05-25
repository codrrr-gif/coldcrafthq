# New-Niche List Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 4 Instantly campaigns (Tier A + B × 2 niches) targeting retained executive-search recruiters and specialist B2B agencies in US+CA, sourced via AI Ark (10K cap, in-house verification), signal-enriched via existing modules, and scored with a niche-specific 100-pt matrix.

**Architecture:** Python orchestration scripts in `/scripts/campaigns/` chain stages (source → signal-enrich → score+tier → verify+dedupe → push), reading/writing CSVs at `/data/niche-2026/` for idempotency. One new TypeScript module `src/lib/sources/ai-ark.ts` exposes the AI Ark API to both TS and (via a CLI wrapper) Python. Niche-specific tier-gating implemented in a pure-Python module under `scripts/campaigns/lib/` so it can be unit-tested.

**Tech Stack:** Next.js TS (existing app), Python 3 for orchestration (matches existing campaign scripts), AI Ark API (new source), Instantly API (existing client), MillionVerifier API (existing), Apify (existing scrapers via `signals/utils.ts`).

**Reference spec:** `docs/superpowers/specs/2026-05-25-new-niche-list-build-design.md`

---

## File Structure

**New files:**
- `src/lib/sources/ai-ark.ts` — AI Ark API client (TS)
- `src/lib/sources/__tests__/ai-ark.test.ts` — unit tests
- `scripts/campaigns/ai-ark-cli.ts` — Node CLI wrapper so Python scripts can invoke the AI Ark client
- `scripts/campaigns/lib/niche_scoring.py` — pure-Python niche-specific tier-gating
- `scripts/campaigns/lib/__init__.py`
- `scripts/campaigns/test_niche_scoring.py` — pytest for the scorer
- `scripts/campaigns/ai-ark-pull-retained-recruiters.py` — Stage 1 (ICP-1)
- `scripts/campaigns/ai-ark-pull-specialist-agencies.py` — Stage 1 (ICP-2)
- `scripts/campaigns/enrich-signals-niche-2026.py` — Stage 2
- `scripts/campaigns/score-and-tier-niche-2026.py` — Stage 3
- `scripts/campaigns/verify-and-dedupe-niche-2026.py` — Stage 4
- `scripts/campaigns/setup-niche-2026-campaigns.py` — Stage 5 (campaigns + sequences)
- `scripts/campaigns/push-niche-2026-leads.py` — Stage 5 (upload leads)
- `scripts/campaigns/sequences/niche-2026-sequences.json` — 4 sequence definitions
- `data/niche-2026/` — intermediate artifacts (gitignored)
- `segmented-lists/CC-List-RetainedRecruiters-A.csv`, `-B.csv`, `CC-List-SpecialistAgencies-A.csv`, `-B.csv` — final outputs

**Modified files:**
- `.env.prod` — append `AI_ARK_API=684348122e804576a29bcecadaf3da5b`
- `.gitignore` — add `/data/niche-2026/` if not already covered

---

## Task 1: Discover AI Ark API contract

**Files:**
- Create: `docs/niche-2026/ai-ark-api-notes.md`

- [ ] **Step 1: Find the AI Ark documentation URL**

The user has the API key but no docs link. AI Ark is most likely `aiark.io` or `aiark.com`. Search:

```bash
curl -sI https://aiark.io 2>&1 | head -5
curl -sI https://aiark.com 2>&1 | head -5
curl -sI https://api.aiark.io 2>&1 | head -5
curl -sI https://api.aiark.com 2>&1 | head -5
```

Expected: at least one returns `HTTP/2 200` or a redirect. Record the working hostname.

- [ ] **Step 2: Hit the most likely auth endpoint with the key to probe shape**

```bash
KEY="684348122e804576a29bcecadaf3da5b"
# Try common auth header patterns
curl -s -H "x-api-key: $KEY" "https://api.aiark.io/v1/me" | head -50
curl -s -H "Authorization: Bearer $KEY" "https://api.aiark.io/v1/me" | head -50
curl -s "https://api.aiark.io/v1/me?api_key=$KEY" | head -50
```

Expected: one of these returns a JSON object describing the account / plan / limits. Record which auth scheme works.

- [ ] **Step 3: Document the response shape and the search/lead endpoints**

Use the working auth scheme to discover:
- The "search companies" endpoint (filter by industry / headcount / geo)
- The "fetch contacts" endpoint (filter by titles, return email + name + company)
- Whether the response is paginated, and the page-size cap (key constraint for the 10K plan)

Write findings to `docs/niche-2026/ai-ark-api-notes.md` with:
- Base URL
- Auth scheme (header name + format)
- Search endpoint path + accepted filter params
- Contacts endpoint path + accepted filter params
- Response JSON shape (lead object: which keys are name, email, company, title, etc.)
- Pagination (cursor or page param, max page size)
- Rate limits (if surfaced in response headers)

- [ ] **Step 4: Stop and confirm findings before coding**

If the API does not match the expected shape (e.g., it's a chat/RAG API, not a B2B data API), STOP and report back to the user before writing the client. The spec assumes contact-data semantics.

- [ ] **Step 5: Commit the notes**

```bash
git add docs/niche-2026/ai-ark-api-notes.md
git commit -m "docs: capture AI Ark API contract for new-niche list build"
```

---

## Task 2: Build AI Ark TypeScript client

**Files:**
- Create: `src/lib/sources/ai-ark.ts`
- Test: `src/lib/sources/__tests__/ai-ark.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/sources/__tests__/ai-ark.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchLeads, type AIArkSearchParams } from '../ai-ark';

describe('ai-ark client', () => {
  beforeEach(() => {
    process.env.AI_ARK_API = 'test-key-123';
    global.fetch = vi.fn();
  });

  it('throws when API key is missing', async () => {
    delete process.env.AI_ARK_API;
    await expect(searchLeads({ industries: ['recruiting'], headcount_min: 5, headcount_max: 75, geo: ['US', 'CA'], titles: ['Founder'] }))
      .rejects.toThrow('AI_ARK_API not set');
  });

  it('sends the documented auth header and request body', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ leads: [], next_cursor: null }),
    });

    const params: AIArkSearchParams = {
      industries: ['Staffing & Recruiting'],
      headcount_min: 5,
      headcount_max: 75,
      geo: ['US', 'CA'],
      titles: ['Founder', 'Managing Partner'],
      limit: 100,
    };
    await searchLeads(params);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('aiark'); // hostname from Task 1
    expect(opts.headers).toMatchObject({ /* auth header from Task 1 */ });
    const body = JSON.parse(opts.body);
    expect(body.industries).toEqual(['Staffing & Recruiting']);
    expect(body.headcount_min).toBe(5);
    expect(body.limit).toBe(100);
  });

  it('paginates until exhausted or limit reached', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ leads: [{ email: 'a@x.com' }], next_cursor: 'c1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ leads: [{ email: 'b@x.com' }], next_cursor: null }) });

    const results = await searchLeads({
      industries: ['x'], headcount_min: 1, headcount_max: 100, geo: ['US'], titles: ['CEO'], limit: 1000,
    });

    expect(results).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws with response body on non-OK status', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    });

    await expect(searchLeads({ industries: ['x'], headcount_min: 1, headcount_max: 10, geo: ['US'], titles: ['CEO'] }))
      .rejects.toThrow(/429.*rate limited/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/matt/Documents/coldcrafthq
npx vitest run src/lib/sources/__tests__/ai-ark.test.ts
```

Expected: FAIL with "Cannot find module '../ai-ark'".

- [ ] **Step 3: Implement the client**

Create `src/lib/sources/ai-ark.ts`. Substitute the real endpoint paths / auth scheme / response keys from Task 1's notes where placeholders appear:

```typescript
// ============================================
// AI Ark API Client
// ============================================
// B2B contact-data source. Plan cap: 10K leads per account.
// We bypass AI Ark's built-in email verification (uses MillionVerifier
// downstream instead — preserves AI Ark quota for raw leads).
// ============================================

const API_BASE = 'https://api.aiark.io/v1'; // confirm from Task 1
const SEARCH_PATH = '/leads/search';        // confirm from Task 1
const PAGE_SIZE = 100;                       // confirm from Task 1
const MAX_RESULTS_PER_CALL = 10_000;         // plan cap

export interface AIArkSearchParams {
  industries: string[];
  headcount_min: number;
  headcount_max: number;
  geo: string[]; // ['US', 'CA']
  titles: string[];
  excluded_titles?: string[];
  limit?: number; // overall ceiling, clamped to MAX_RESULTS_PER_CALL
}

export interface AIArkLead {
  email: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  company_name?: string;
  company_industry?: string;
  company_headcount?: number;
  company_domain?: string;
  company_location?: string;
  linkedin_url?: string;
  // include any additional fields AI Ark returns; pass-through unknown keys
  [key: string]: unknown;
}

function apiKey(): string {
  const key = process.env.AI_ARK_API;
  if (!key) throw new Error('AI_ARK_API not set');
  return key;
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    // CONFIRM auth scheme from Task 1 — examples below, keep ONE:
    'x-api-key': apiKey(),
    // 'Authorization': `Bearer ${apiKey()}`,
  };
}

export async function searchLeads(params: AIArkSearchParams): Promise<AIArkLead[]> {
  const limit = Math.min(params.limit ?? MAX_RESULTS_PER_CALL, MAX_RESULTS_PER_CALL);
  const results: AIArkLead[] = [];
  let cursor: string | null = null;

  while (results.length < limit) {
    const remaining = limit - results.length;
    const body = {
      industries: params.industries,
      headcount_min: params.headcount_min,
      headcount_max: params.headcount_max,
      geo: params.geo,
      titles: params.titles,
      excluded_titles: params.excluded_titles ?? [],
      limit: Math.min(PAGE_SIZE, remaining),
      cursor,
      verify_emails: false, // CRITICAL: do not consume AI Ark's verification budget
    };

    const res = await fetch(`${API_BASE}${SEARCH_PATH}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI Ark searchLeads failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    const leads: AIArkLead[] = data.leads ?? data.data ?? [];
    results.push(...leads);

    cursor = data.next_cursor ?? null;
    if (!cursor || leads.length === 0) break;
  }

  return results.slice(0, limit);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/sources/__tests__/ai-ark.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/ai-ark.ts src/lib/sources/__tests__/ai-ark.test.ts
git commit -m "feat(sources): add AI Ark B2B data API client"
```

---

## Task 3: Build the Node CLI wrapper for Python orchestration

**Files:**
- Create: `scripts/campaigns/ai-ark-cli.ts`

Why: existing campaign orchestration is Python. Rather than reimplement the AI Ark client in Python, wrap the TS client in a CLI so Python scripts invoke it via subprocess.

- [ ] **Step 1: Write the CLI**

Create `scripts/campaigns/ai-ark-cli.ts`:

```typescript
#!/usr/bin/env tsx
// Usage:
//   tsx scripts/campaigns/ai-ark-cli.ts --params-file=path/to/params.json --out=path/to/raw.csv
//
// Reads a JSON file matching AIArkSearchParams, pulls leads from AI Ark,
// writes a CSV (header row + one row per lead) to --out.
import { readFileSync, writeFileSync } from 'node:fs';
import { searchLeads, type AIArkSearchParams, type AIArkLead } from '../../src/lib/sources/ai-ark';

function arg(name: string): string {
  const found = process.argv.find(a => a.startsWith(`--${name}=`));
  if (!found) throw new Error(`Missing --${name}=`);
  return found.split('=', 2)[1];
}

function toCsv(leads: AIArkLead[]): string {
  if (leads.length === 0) return '';
  // Stable column order — extra unknown keys appended alphabetically.
  const preferred = ['email', 'first_name', 'last_name', 'title', 'company_name',
    'company_domain', 'company_industry', 'company_headcount', 'company_location', 'linkedin_url'];
  const allKeys = new Set<string>();
  leads.forEach(l => Object.keys(l).forEach(k => allKeys.add(k)));
  const cols = [...preferred.filter(k => allKeys.has(k)),
    ...[...allKeys].filter(k => !preferred.includes(k)).sort()];

  const escape = (v: unknown) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = cols.join(',');
  const rows = leads.map(l => cols.map(c => escape(l[c])).join(','));
  return [header, ...rows].join('\n') + '\n';
}

async function main() {
  const paramsPath = arg('params-file');
  const outPath = arg('out');
  const params: AIArkSearchParams = JSON.parse(readFileSync(paramsPath, 'utf8'));
  const leads = await searchLeads(params);
  writeFileSync(outPath, toCsv(leads));
  console.log(`Wrote ${leads.length} leads to ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Verify the CLI builds (no test against live API yet)**

```bash
npx tsx --noExecute scripts/campaigns/ai-ark-cli.ts 2>&1 || true
# If --noExecute is unsupported, just type-check:
npx tsc --noEmit scripts/campaigns/ai-ark-cli.ts src/lib/sources/ai-ark.ts
```

Expected: no TypeScript errors. (Runtime invocation deferred to Tasks 4-5.)

- [ ] **Step 3: Commit**

```bash
git add scripts/campaigns/ai-ark-cli.ts
git commit -m "feat(campaigns): add ai-ark-cli wrapper for Python orchestration"
```

---

## Task 4: Smoke-test against live AI Ark API with a tiny pull

**Files:**
- Create: `data/niche-2026/smoke-test-params.json`

- [ ] **Step 1: Add AI Ark key to env file**

Append to `/Users/matt/Documents/coldcrafthq/.env.prod`:

```
AI_ARK_API=684348122e804576a29bcecadaf3da5b
```

- [ ] **Step 2: Add data dir to .gitignore**

Append to `/Users/matt/Documents/coldcrafthq/.gitignore` (if not already there):

```
/data/niche-2026/
```

Then create the dir:

```bash
mkdir -p /Users/matt/Documents/coldcrafthq/data/niche-2026
```

- [ ] **Step 3: Write tiny smoke-test params**

Create `data/niche-2026/smoke-test-params.json`:

```json
{
  "industries": ["Staffing & Recruiting"],
  "headcount_min": 5,
  "headcount_max": 75,
  "geo": ["US", "CA"],
  "titles": ["Managing Partner", "Founder"],
  "excluded_titles": ["Recruiter", "Sourcer"],
  "limit": 10
}
```

- [ ] **Step 4: Run the smoke test**

```bash
cd /Users/matt/Documents/coldcrafthq
set -a && source .env.prod && set +a
npx tsx scripts/campaigns/ai-ark-cli.ts \
  --params-file=data/niche-2026/smoke-test-params.json \
  --out=data/niche-2026/smoke-test.csv
```

Expected: `Wrote 10 leads to data/niche-2026/smoke-test.csv` (or fewer if the filter is too tight). Open the CSV — confirm columns include email, first_name, company_name, title at minimum.

- [ ] **Step 5: Inspect & sanity-check**

```bash
head -3 data/niche-2026/smoke-test.csv
wc -l data/niche-2026/smoke-test.csv
```

Expected: header + 10 rows. If 0 rows or all `null`s, return to Task 1 and re-verify the API contract.

No commit — smoke artifact is gitignored.

---

## Task 5: Pull retained-recruiters list (5K leads, ICP-1)

**Files:**
- Create: `scripts/campaigns/ai-ark-pull-retained-recruiters.py`
- Create: `data/niche-2026/params-retained-recruiters.json`

- [ ] **Step 1: Write the params file**

Create `data/niche-2026/params-retained-recruiters.json`:

```json
{
  "industries": [
    "Staffing & Recruiting",
    "Executive Search",
    "Human Resources Services"
  ],
  "headcount_min": 5,
  "headcount_max": 75,
  "geo": ["US", "CA"],
  "titles": [
    "Managing Partner",
    "Founder",
    "Founding Partner",
    "Managing Director",
    "President",
    "Practice Lead",
    "VP Business Development",
    "Vice President Business Development"
  ],
  "excluded_titles": [
    "Recruiter",
    "Sourcer",
    "Talent Coordinator",
    "Researcher",
    "Intern"
  ],
  "limit": 5000
}
```

- [ ] **Step 2: Write the Python wrapper**

Create `scripts/campaigns/ai-ark-pull-retained-recruiters.py`:

```python
#!/usr/bin/env python3
"""Pull 5K retained-executive-search leads from AI Ark (US+CA).
Wraps ai-ark-cli.ts; verification is skipped (handled later by MillionVerifier).
"""
import os
import subprocess
import sys

ROOT = os.path.expanduser('~/Documents/coldcrafthq')
PARAMS = f'{ROOT}/data/niche-2026/params-retained-recruiters.json'
OUT = f'{ROOT}/data/niche-2026/raw-ai-ark-recruiters.csv'

def main() -> int:
    os.chdir(ROOT)
    # Load env from .env.prod into subprocess
    env = os.environ.copy()
    with open(f'{ROOT}/.env.prod') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k] = v.strip('"').strip("'")
    cmd = ['npx', 'tsx', 'scripts/campaigns/ai-ark-cli.ts',
           f'--params-file={PARAMS}', f'--out={OUT}']
    print(f'Running: {" ".join(cmd)}')
    result = subprocess.run(cmd, env=env)
    return result.returncode

if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 3: Run it**

```bash
cd /Users/matt/Documents/coldcrafthq
python3 scripts/campaigns/ai-ark-pull-retained-recruiters.py
```

Expected: `Wrote ~5000 leads to data/niche-2026/raw-ai-ark-recruiters.csv` (could be fewer if AI Ark's universe for this ICP is tight — that's still acceptable).

- [ ] **Step 4: Verify the output**

```bash
wc -l data/niche-2026/raw-ai-ark-recruiters.csv
head -2 data/niche-2026/raw-ai-ark-recruiters.csv
```

Expected: 1 header row + N data rows where N is between 500 and 5001. If N is <500, the ICP-1 filters are too tight — open `params-retained-recruiters.json` and relax (e.g., drop "Practice Lead" requirement or widen headcount to 5-100).

- [ ] **Step 5: Commit the pull script + params**

```bash
git add scripts/campaigns/ai-ark-pull-retained-recruiters.py \
        data/niche-2026/params-retained-recruiters.json
git commit -m "feat(campaigns): pull retained recruiters from AI Ark (ICP-1)"
```

(The CSV itself is gitignored.)

---

## Task 6: Pull specialist-agencies list (5K leads, ICP-2)

**Files:**
- Create: `scripts/campaigns/ai-ark-pull-specialist-agencies.py`
- Create: `data/niche-2026/params-specialist-agencies.json`

- [ ] **Step 1: Write the params file**

Create `data/niche-2026/params-specialist-agencies.json`:

```json
{
  "industries": [
    "Public Relations",
    "Marketing & Advertising",
    "Management Consulting",
    "Professional Services"
  ],
  "industry_keywords_whitelist": [
    "PR agency",
    "public relations",
    "revops",
    "revenue operations",
    "lifecycle marketing",
    "CRM agency",
    "demand generation",
    "performance marketing",
    "paid media",
    "B2B content",
    "sales enablement",
    "ABM agency",
    "account-based marketing",
    "fractional CMO"
  ],
  "industry_keywords_blacklist": [
    "design studio",
    "web design",
    "dev shop",
    "software development",
    "branding studio"
  ],
  "headcount_min": 5,
  "headcount_max": 50,
  "geo": ["US", "CA"],
  "titles": [
    "Founder",
    "CEO",
    "Managing Director",
    "Managing Partner",
    "Head of New Business",
    "Head of Growth",
    "COO",
    "Chief Operating Officer"
  ],
  "excluded_titles": [
    "Account Manager",
    "Account Executive",
    "Strategist",
    "Designer",
    "Copywriter",
    "Coordinator"
  ],
  "limit": 5000
}
```

> NOTE: `industry_keywords_whitelist` / `_blacklist` only apply if AI Ark supports keyword filters (confirm from Task 1). If not supported, drop those keys and filter post-pull in Task 6 Step 3 below.

- [ ] **Step 2: Write the Python wrapper**

Create `scripts/campaigns/ai-ark-pull-specialist-agencies.py` (same shape as Task 5, swap paths):

```python
#!/usr/bin/env python3
"""Pull 5K specialist B2B agency leads from AI Ark (US+CA).
Whitelist/blacklist keywords narrow generic agency industries to specialist sub-segments.
"""
import os
import subprocess
import sys

ROOT = os.path.expanduser('~/Documents/coldcrafthq')
PARAMS = f'{ROOT}/data/niche-2026/params-specialist-agencies.json'
OUT = f'{ROOT}/data/niche-2026/raw-ai-ark-agencies.csv'

def main() -> int:
    os.chdir(ROOT)
    env = os.environ.copy()
    with open(f'{ROOT}/.env.prod') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k] = v.strip('"').strip("'")
    cmd = ['npx', 'tsx', 'scripts/campaigns/ai-ark-cli.ts',
           f'--params-file={PARAMS}', f'--out={OUT}']
    print(f'Running: {" ".join(cmd)}')
    result = subprocess.run(cmd, env=env)
    return result.returncode

if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 3: Run it (+ post-filter if AI Ark lacks keyword filters)**

```bash
cd /Users/matt/Documents/coldcrafthq
python3 scripts/campaigns/ai-ark-pull-specialist-agencies.py
```

If AI Ark ignored the whitelist/blacklist, post-filter on company description/industry text. Add this to `ai-ark-pull-specialist-agencies.py` (after the subprocess call) BEFORE running:

```python
# Post-filter (only needed if AI Ark didn't apply whitelist/blacklist)
import csv, json
with open(PARAMS) as f:
    p = json.load(f)
whitelist = [k.lower() for k in p.get('industry_keywords_whitelist', [])]
blacklist = [k.lower() for k in p.get('industry_keywords_blacklist', [])]

if whitelist or blacklist:
    rows = []
    with open(OUT, newline='') as f:
        reader = csv.DictReader(f)
        for r in reader:
            blob = ' '.join(str(v or '').lower() for k, v in r.items()
                            if k in ('company_industry', 'company_name', 'title'))
            if whitelist and not any(w in blob for w in whitelist):
                continue
            if blacklist and any(b in blob for b in blacklist):
                continue
            rows.append(r)
    if rows:
        with open(OUT, 'w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
        print(f'Post-filtered to {len(rows)} specialist agencies')
```

- [ ] **Step 4: Verify the output**

```bash
wc -l data/niche-2026/raw-ai-ark-agencies.csv
head -2 data/niche-2026/raw-ai-ark-agencies.csv
```

Expected: header + 500-5000 rows. If <500 after post-filtering, loosen whitelist.

- [ ] **Step 5: Commit**

```bash
git add scripts/campaigns/ai-ark-pull-specialist-agencies.py \
        data/niche-2026/params-specialist-agencies.json
git commit -m "feat(campaigns): pull specialist B2B agencies from AI Ark (ICP-2)"
```

---

## Task 7: Signal enrichment (indeed-jobs + Apify LinkedIn headcount)

**Files:**
- Create: `scripts/campaigns/enrich-signals-niche-2026.py`

This script reads the two raw CSVs, calls existing signal modules per company, and appends 4 new columns: `signal_job_post_hit`, `signal_job_post_role`, `signal_headcount_delta_yoy`, `signal_headcount_hit`.

- [ ] **Step 1: Inspect existing signal modules**

Read these files to see exposed functions/CLIs:

```bash
cat /Users/matt/Documents/coldcrafthq/src/lib/signals/utils.ts | head -80
ls /Users/matt/Documents/coldcrafthq/src/lib/signals/
find /Users/matt/Documents/coldcrafthq -name "indeed-jobs*" -type f 2>/dev/null
```

Record:
- Which TS function (or HTTP endpoint) the indeed-jobs module exposes
- Which TS function or Apify actor the headcount-delta signal uses
- Whether either can be invoked from Python (CLI, HTTP, or via the running Next.js app)

If neither has a CLI, build a tiny CLI wrapper at `scripts/campaigns/signals-cli.ts` mirroring `ai-ark-cli.ts` (Task 3 pattern) that exports the two enrichment calls.

- [ ] **Step 2: Write the enrichment orchestrator**

Create `scripts/campaigns/enrich-signals-niche-2026.py`:

```python
#!/usr/bin/env python3
"""Enrich raw AI Ark CSVs with signal columns.

For each unique company in the input CSV:
  1. Call indeed-jobs signal: did the company post a matching role <30d?
     - Recruiters: roles matching ["business development", "partner", "director of business development"]
     - Agencies:   roles matching ["account executive", "account director", "senior strategist"]
  2. Call Apify LinkedIn headcount-delta signal: YoY % change.

Writes signal-enriched CSV alongside the raw CSV.
"""
import csv
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any

ROOT = os.path.expanduser('~/Documents/coldcrafthq')

INPUTS = [
    {
        'in':  f'{ROOT}/data/niche-2026/raw-ai-ark-recruiters.csv',
        'out': f'{ROOT}/data/niche-2026/signal-enriched-recruiters.csv',
        'job_role_keywords': ['business development', 'partner',
                              'director of business development'],
    },
    {
        'in':  f'{ROOT}/data/niche-2026/raw-ai-ark-agencies.csv',
        'out': f'{ROOT}/data/niche-2026/signal-enriched-agencies.csv',
        'job_role_keywords': ['account executive', 'account director',
                              'senior strategist'],
    },
]

def load_env() -> Dict[str, str]:
    env = os.environ.copy()
    with open(f'{ROOT}/.env.prod') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k] = v.strip('"').strip("'")
    return env

def call_signals_cli(domain: str, role_keywords: list[str], env: Dict[str, str]) -> Dict[str, Any]:
    """Invoke the signals CLI wrapper for one company. Returns:
       {job_post_hit: bool, job_post_role: str, headcount_delta_yoy: float | None}
       On error: all defaults (False/empty/None) — never raise per-company.
    """
    try:
        cmd = ['npx', 'tsx', 'scripts/campaigns/signals-cli.ts',
               f'--domain={domain}',
               f'--job-keywords={",".join(role_keywords)}']
        r = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            print(f'  [warn] signals-cli {domain}: {r.stderr.strip()[:200]}', file=sys.stderr)
            return {'job_post_hit': False, 'job_post_role': '', 'headcount_delta_yoy': None}
        return json.loads(r.stdout)
    except Exception as e:
        print(f'  [warn] signals-cli {domain}: {e}', file=sys.stderr)
        return {'job_post_hit': False, 'job_post_role': '', 'headcount_delta_yoy': None}

def enrich(input_path: str, output_path: str, role_keywords: list[str], env: Dict[str, str]) -> None:
    with open(input_path, newline='') as f:
        rows = list(csv.DictReader(f))
    print(f'Enriching {len(rows)} rows from {input_path}')

    # Dedupe by domain so we only call signals once per company
    domains = {(r.get('company_domain') or '').strip().lower()
               for r in rows if r.get('company_domain')}
    domains.discard('')
    domain_signals: Dict[str, Dict[str, Any]] = {}

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(call_signals_cli, d, role_keywords, env): d for d in domains}
        for i, fut in enumerate(as_completed(futures)):
            d = futures[fut]
            domain_signals[d] = fut.result()
            if (i + 1) % 50 == 0:
                print(f'  signal progress: {i + 1}/{len(domains)}')

    # Attach signal columns to each row
    fieldnames = list(rows[0].keys()) + [
        'signal_job_post_hit', 'signal_job_post_role',
        'signal_headcount_delta_yoy', 'signal_headcount_hit'
    ]
    for r in rows:
        d = (r.get('company_domain') or '').strip().lower()
        s = domain_signals.get(d, {})
        r['signal_job_post_hit']      = '1' if s.get('job_post_hit') else '0'
        r['signal_job_post_role']     = s.get('job_post_role') or ''
        delta = s.get('headcount_delta_yoy')
        r['signal_headcount_delta_yoy'] = '' if delta is None else f'{delta:.3f}'
        # Threshold differs per niche — apply downstream in scoring, but tag here too:
        threshold = 0.15 if 'recruiters' in input_path else 0.20
        r['signal_headcount_hit'] = '1' if (delta is not None and delta >= threshold) else '0'

    with open(output_path, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f'Wrote {len(rows)} enriched rows to {output_path}')

def main() -> int:
    env = load_env()
    os.chdir(ROOT)
    for cfg in INPUTS:
        enrich(cfg['in'], cfg['out'], cfg['job_role_keywords'], env)
    return 0

if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 3: Run it**

```bash
cd /Users/matt/Documents/coldcrafthq
python3 scripts/campaigns/enrich-signals-niche-2026.py
```

Expected: completes in 15-45 min (scraper-bound). Watch stderr for `[warn]` lines — <5% failure rate is acceptable, anything higher means the signals-CLI is broken and needs fixing before continuing.

- [ ] **Step 4: Verify**

```bash
head -2 data/niche-2026/signal-enriched-recruiters.csv
wc -l data/niche-2026/signal-enriched-recruiters.csv
# Sanity-check signal hit rate (should be 5-25%, not 0% or 100%)
awk -F, 'NR>1{n++; if($NF=="1")a++} END{print "headcount hit rate:", a/n}' \
  data/niche-2026/signal-enriched-recruiters.csv
```

- [ ] **Step 5: Commit**

```bash
git add scripts/campaigns/enrich-signals-niche-2026.py \
        scripts/campaigns/signals-cli.ts
git commit -m "feat(campaigns): signal-enrich niche-2026 raw lists (job posts + headcount)"
```

---

## Task 8: Niche-specific tier-gating scorer (pure-Python module + tests)

**Files:**
- Create: `scripts/campaigns/lib/__init__.py`
- Create: `scripts/campaigns/lib/niche_scoring.py`
- Test: `scripts/campaigns/test_niche_scoring.py`

- [ ] **Step 1: Write the failing tests**

Create `scripts/campaigns/test_niche_scoring.py`:

```python
"""Tests for niche-specific 100-pt ICP scoring."""
import pytest
from lib.niche_scoring import score_lead, tier_for_score, RECRUITER_ICP, AGENCY_ICP

class TestRecruiterScoring:
    def test_perfect_lead_with_both_signals_scores_100(self):
        lead = {
            'company_industry': 'Executive Search',
            'company_headcount': 25,
            'title': 'Managing Partner',
            'company_location': 'US',
            'signal_job_post_hit': '1',
            'signal_headcount_hit': '1',
        }
        assert score_lead(lead, RECRUITER_ICP) == 100

    def test_firmographic_only_caps_at_75(self):
        lead = {
            'company_industry': 'Executive Search',
            'company_headcount': 25,
            'title': 'Managing Partner',
            'company_location': 'US',
            'signal_job_post_hit': '0',
            'signal_headcount_hit': '0',
        }
        assert score_lead(lead, RECRUITER_ICP) == 75

    def test_excluded_industry_returns_zero(self):
        lead = {
            'company_industry': 'Contract Staffing',
            'company_headcount': 25,
            'title': 'Managing Partner',
            'company_location': 'US',
            'signal_job_post_hit': '0',
            'signal_headcount_hit': '0',
        }
        assert score_lead(lead, RECRUITER_ICP) == 0

    def test_canada_geo_scores_8(self):
        lead = {
            'company_industry': 'Executive Search',
            'company_headcount': 25,
            'title': 'Managing Partner',
            'company_location': 'CA',
            'signal_job_post_hit': '0',
            'signal_headcount_hit': '0',
        }
        assert score_lead(lead, RECRUITER_ICP) == 73

    def test_headcount_out_of_band_loses_points(self):
        lead = {
            'company_industry': 'Executive Search',
            'company_headcount': 100,  # out of 5-75 band
            'title': 'Managing Partner',
            'company_location': 'US',
            'signal_job_post_hit': '0',
            'signal_headcount_hit': '0',
        }
        assert score_lead(lead, RECRUITER_ICP) == 55

    def test_excluded_title_returns_zero(self):
        lead = {
            'company_industry': 'Executive Search',
            'company_headcount': 25,
            'title': 'Recruiter',
            'company_location': 'US',
            'signal_job_post_hit': '0',
            'signal_headcount_hit': '0',
        }
        assert score_lead(lead, RECRUITER_ICP) == 0

class TestAgencyScoring:
    def test_perfect_agency_scores_100(self):
        lead = {
            'company_industry': 'public relations',
            'company_headcount': 15,
            'title': 'Founder',
            'company_location': 'US',
            'signal_job_post_hit': '1',
            'signal_headcount_hit': '1',
        }
        assert score_lead(lead, AGENCY_ICP) == 100

    def test_agency_firmo_only_caps_at_75(self):
        lead = {
            'company_industry': 'RevOps consultancy',
            'company_headcount': 15,
            'title': 'Founder',
            'company_location': 'US',
            'signal_job_post_hit': '0',
            'signal_headcount_hit': '0',
        }
        assert score_lead(lead, AGENCY_ICP) == 75

class TestTierGating:
    def test_tier_a_threshold(self):
        assert tier_for_score(90) == 'A'
        assert tier_for_score(100) == 'A'
        assert tier_for_score(95) == 'A'

    def test_tier_b_threshold(self):
        assert tier_for_score(70) == 'B'
        assert tier_for_score(89) == 'B'

    def test_drop_threshold(self):
        assert tier_for_score(69) is None
        assert tier_for_score(0) is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/matt/Documents/coldcrafthq/scripts/campaigns
python3 -m pytest test_niche_scoring.py -v
```

Expected: ImportError — `lib.niche_scoring` doesn't exist yet.

- [ ] **Step 3: Implement the module**

Create `scripts/campaigns/lib/__init__.py` (empty file).

Create `scripts/campaigns/lib/niche_scoring.py`:

```python
"""Niche-specific 100-pt ICP scoring + tier gates.

Used by score-and-tier-niche-2026.py. Pure functions, no I/O, easily testable.

Scoring components (max points):
    industry_match: 25
    headcount_band: 20
    title_seniority: 20
    geo:            10
    signal_job:     15
    signal_growth:  10
    total max:     100

Tier gates:
    A: 90-100
    B: 70-89
    Drop: <70 (returns None from tier_for_score)

Hard gates that return 0:
    - excluded title (e.g., "Recruiter" for RECRUITER_ICP)
    - excluded industry (e.g., "Contract Staffing" for RECRUITER_ICP)
"""
from typing import Optional, TypedDict

class IcpConfig(TypedDict):
    name: str
    industry_match_keywords: list[str]   # ANY match awards full industry points
    industry_blacklist: list[str]         # ANY match returns 0 (hard exclude)
    headcount_sweet:  tuple[int, int]    # (min, max) for full 20 points
    headcount_wide:   tuple[int, int]    # outer band for 12 points
    titles_max:       list[str]          # 20 points
    titles_high:      list[str]          # 15 points
    titles_mid:       list[str]          # 10-12 points
    excluded_titles:  list[str]          # hard exclude -> 0

RECRUITER_ICP: IcpConfig = {
    'name': 'recruiters',
    'industry_match_keywords': [
        'executive search', 'staffing & recruiting',
        'human resources services', 'retained search',
    ],
    'industry_blacklist': [
        'contract staffing', 'contingent', 'rpo', 'temp agency',
    ],
    'headcount_sweet': (10, 40),
    'headcount_wide':  (5, 75),
    'titles_max':  ['managing partner', 'founder', 'founding partner'],
    'titles_high': ['managing director', 'president'],
    'titles_mid':  ['vp business development',
                    'vice president business development',
                    'practice lead'],
    'excluded_titles': ['recruiter', 'sourcer', 'talent coordinator',
                        'researcher', 'intern'],
}

AGENCY_ICP: IcpConfig = {
    'name': 'agencies',
    'industry_match_keywords': [
        'public relations', 'pr agency', 'revops', 'revenue operations',
        'lifecycle marketing', 'crm agency', 'demand generation',
        'performance marketing', 'paid media', 'b2b content',
        'sales enablement', 'abm', 'account-based marketing',
        'fractional cmo',
    ],
    'industry_blacklist': [
        'design studio', 'web design', 'dev shop',
        'software development', 'branding studio',
    ],
    'headcount_sweet': (8, 30),
    'headcount_wide':  (5, 50),
    'titles_max':  ['founder', 'ceo', 'managing director', 'managing partner'],
    'titles_high': ['head of new business', 'head of growth'],
    'titles_mid':  ['coo', 'chief operating officer'],
    'excluded_titles': ['account manager', 'account executive', 'strategist',
                        'designer', 'copywriter', 'coordinator'],
}

def _norm(v) -> str:
    return str(v or '').strip().lower()

def score_lead(lead: dict, icp: IcpConfig) -> int:
    """Score one lead 0-100 against an ICP config. Hard exclusions return 0."""
    industry = _norm(lead.get('company_industry'))
    title    = _norm(lead.get('title'))
    geo      = _norm(lead.get('company_location'))
    try:
        headcount = int(lead.get('company_headcount') or 0)
    except (TypeError, ValueError):
        headcount = 0

    # Hard gates
    if any(b in industry for b in icp['industry_blacklist']):
        return 0
    if any(t == title or t in title for t in icp['excluded_titles']):
        return 0

    score = 0

    # Industry match (25)
    if any(k in industry for k in icp['industry_match_keywords']):
        score += 25

    # Headcount band (20 / 12 / 0)
    sw_lo, sw_hi = icp['headcount_sweet']
    wd_lo, wd_hi = icp['headcount_wide']
    if sw_lo <= headcount <= sw_hi:
        score += 20
    elif wd_lo <= headcount <= wd_hi:
        score += 12

    # Title seniority (20 / 15 / 10 / 8)
    if any(t in title for t in icp['titles_max']):
        score += 20
    elif any(t in title for t in icp['titles_high']):
        score += 15
    elif any(t in title for t in icp['titles_mid']):
        score += 10

    # Geo (10 / 8)
    if 'us' in geo or 'united states' in geo:
        score += 10
    elif 'ca' in geo or 'canada' in geo:
        score += 8

    # Signal: job post (15)
    if str(lead.get('signal_job_post_hit', '0')) == '1':
        score += 15

    # Signal: headcount growth (10)
    if str(lead.get('signal_headcount_hit', '0')) == '1':
        score += 10

    return min(100, score)

def tier_for_score(score: int) -> Optional[str]:
    """Return 'A' (90-100), 'B' (70-89), or None (drop)."""
    if score >= 90:
        return 'A'
    if score >= 70:
        return 'B'
    return None
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/matt/Documents/coldcrafthq/scripts/campaigns
python3 -m pytest test_niche_scoring.py -v
```

Expected: all 11 tests PASS. If any fail, the test reveals the bug — fix the implementation, do NOT change the test to match.

- [ ] **Step 5: Commit**

```bash
cd /Users/matt/Documents/coldcrafthq
git add scripts/campaigns/lib/ scripts/campaigns/test_niche_scoring.py
git commit -m "feat(campaigns): add niche-specific 100pt ICP scoring + tier gates"
```

---

## Task 9: Apply scoring + tier split into 4 CSVs

**Files:**
- Create: `scripts/campaigns/score-and-tier-niche-2026.py`

- [ ] **Step 1: Write the orchestrator**

Create `scripts/campaigns/score-and-tier-niche-2026.py`:

```python
#!/usr/bin/env python3
"""Apply niche-specific scoring and split each signal-enriched CSV
into Tier A / Tier B segments (drops anything <70)."""
import csv
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(__file__))
from lib.niche_scoring import score_lead, tier_for_score, RECRUITER_ICP, AGENCY_ICP

ROOT = os.path.expanduser('~/Documents/coldcrafthq')

INPUTS = [
    {
        'in':  f'{ROOT}/data/niche-2026/signal-enriched-recruiters.csv',
        'out_a': f'{ROOT}/data/niche-2026/scored-recruiters-A.csv',
        'out_b': f'{ROOT}/data/niche-2026/scored-recruiters-B.csv',
        'icp': RECRUITER_ICP,
    },
    {
        'in':  f'{ROOT}/data/niche-2026/signal-enriched-agencies.csv',
        'out_a': f'{ROOT}/data/niche-2026/scored-agencies-A.csv',
        'out_b': f'{ROOT}/data/niche-2026/scored-agencies-B.csv',
        'icp': AGENCY_ICP,
    },
]

def process(cfg: dict) -> None:
    with open(cfg['in'], newline='') as f:
        rows = list(csv.DictReader(f))
    print(f"\nScoring {len(rows)} rows from {cfg['in']}")

    a_rows, b_rows = [], []
    tier_counts = Counter()
    for r in rows:
        s = score_lead(r, cfg['icp'])
        t = tier_for_score(s)
        r['icp_score'] = str(s)
        r['icp_tier']  = t or 'DROP'
        tier_counts[r['icp_tier']] += 1
        if t == 'A':
            a_rows.append(r)
        elif t == 'B':
            b_rows.append(r)

    print(f'  Tier A: {tier_counts["A"]}  Tier B: {tier_counts["B"]}  Drop: {tier_counts["DROP"]}')

    for path, rows_out in [(cfg['out_a'], a_rows), (cfg['out_b'], b_rows)]:
        if not rows_out:
            print(f'  [warn] no rows for {path}')
            continue
        with open(path, 'w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=list(rows_out[0].keys()))
            w.writeheader()
            w.writerows(rows_out)
        print(f'  Wrote {len(rows_out)} rows to {path}')

def main() -> int:
    for cfg in INPUTS:
        process(cfg)
    return 0

if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 2: Run it**

```bash
cd /Users/matt/Documents/coldcrafthq
python3 scripts/campaigns/score-and-tier-niche-2026.py
```

Expected: each niche prints Tier A / B / Drop counts. Spec target distribution: A ~15-25%, B ~60-70%, Drop ~10-20%.

- [ ] **Step 3: Sanity-check the splits**

```bash
wc -l data/niche-2026/scored-*.csv
```

If Tier A is <5% or >40%, the scoring matrix or signal-enrichment hit rate is off — revisit Task 7 thresholds.

- [ ] **Step 4: Commit**

```bash
git add scripts/campaigns/score-and-tier-niche-2026.py
git commit -m "feat(campaigns): score + tier-split niche-2026 leads"
```

---

## Task 10: Verify emails + dedupe vs existing 18K universe

**Files:**
- Create: `scripts/campaigns/verify-and-dedupe-niche-2026.py`

- [ ] **Step 1: Inspect existing MillionVerifier wiring**

```bash
grep -rn "MILLIONVERIFIER\|millionverifier\|million-verifier" \
  /Users/matt/Documents/coldcrafthq/src \
  /Users/matt/Documents/coldcrafthq/scripts | head -20
```

Record: which existing TS function / CLI / bash script does batch verification.

- [ ] **Step 2: Write the orchestrator**

Create `scripts/campaigns/verify-and-dedupe-niche-2026.py`:

```python
#!/usr/bin/env python3
"""Verify scored CSVs via MillionVerifier, dedupe against the existing
18K-lead universe in /segmented-lists/, and write final 4 CSVs into
/segmented-lists/ ready for Instantly import."""
import csv
import glob
import os
import subprocess
import sys
import time
from typing import Set

ROOT = os.path.expanduser('~/Documents/coldcrafthq')
SEG_DIR = f'{ROOT}/segmented-lists'

INPUTS = [
    (f'{ROOT}/data/niche-2026/scored-recruiters-A.csv',
     f'{SEG_DIR}/CC-List-RetainedRecruiters-A.csv'),
    (f'{ROOT}/data/niche-2026/scored-recruiters-B.csv',
     f'{SEG_DIR}/CC-List-RetainedRecruiters-B.csv'),
    (f'{ROOT}/data/niche-2026/scored-agencies-A.csv',
     f'{SEG_DIR}/CC-List-SpecialistAgencies-A.csv'),
    (f'{ROOT}/data/niche-2026/scored-agencies-B.csv',
     f'{SEG_DIR}/CC-List-SpecialistAgencies-B.csv'),
]

def existing_emails() -> Set[str]:
    """Collect all emails already loaded across existing segmented lists."""
    seen: Set[str] = set()
    for path in glob.glob(f'{SEG_DIR}/CC-List-*.csv'):
        # Skip the niche-2026 outputs themselves so we don't dedupe against
        # a partial run from the same session.
        if any(path.endswith(out) for _, out in INPUTS):
            continue
        with open(path, newline='') as f:
            for r in csv.DictReader(f):
                e = (r.get('email') or '').strip().lower()
                if e:
                    seen.add(e)
    print(f'Universe dedupe set: {len(seen)} existing emails')
    return seen

def verify_csv(in_path: str, env: dict) -> str:
    """Run MillionVerifier on the email column. Writes a sibling .verified.csv.
    Implementation depends on Task 10 Step 1 findings — adapt to the existing
    CLI/wrapper in this codebase. The block below is the standard pattern."""
    out_path = in_path.replace('.csv', '.verified.csv')
    # CONFIRM the existing wrapper name/path from Task 10 Step 1.
    # If a TS verifier CLI exists at scripts/verify-emails.ts:
    cmd = ['npx', 'tsx', 'scripts/verify-emails.ts',
           f'--in={in_path}', f'--out={out_path}',
           '--keep=deliverable,risky']
    print(f'Verifying {in_path} ...')
    r = subprocess.run(cmd, env=env, check=True)
    return out_path

def dedupe_and_write(verified_path: str, final_path: str, seen: Set[str]) -> None:
    with open(verified_path, newline='') as f:
        rows = list(csv.DictReader(f))
    before = len(rows)
    kept = []
    for r in rows:
        e = (r.get('email') or '').strip().lower()
        if not e or e in seen:
            continue
        seen.add(e)
        kept.append(r)
    if not kept:
        print(f'  [warn] all {before} rows deduped against existing universe — nothing to write for {final_path}')
        return
    with open(final_path, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(kept[0].keys()))
        w.writeheader()
        w.writerows(kept)
    print(f'  {before} verified → {len(kept)} kept after dedupe → {final_path}')

def load_env() -> dict:
    env = os.environ.copy()
    with open(f'{ROOT}/.env.prod') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k] = v.strip('"').strip("'")
    return env

def main() -> int:
    os.chdir(ROOT)
    env = load_env()
    seen = existing_emails()
    for in_path, final_path in INPUTS:
        if not os.path.exists(in_path):
            print(f'[skip] {in_path} does not exist')
            continue
        verified = verify_csv(in_path, env)
        dedupe_and_write(verified, final_path, seen)
        time.sleep(2)  # polite pause between verifier runs
    return 0

if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 3: Run it**

```bash
cd /Users/matt/Documents/coldcrafthq
python3 scripts/campaigns/verify-and-dedupe-niche-2026.py
```

Expected: 4 final CSVs written into `/segmented-lists/`. Per-niche, expect ~80% of Tier-A rows to survive verify+dedupe, ~70% of Tier-B (Tier B has more low-engagement domains).

- [ ] **Step 4: Verify final counts**

```bash
wc -l segmented-lists/CC-List-RetainedRecruiters-A.csv \
      segmented-lists/CC-List-RetainedRecruiters-B.csv \
      segmented-lists/CC-List-SpecialistAgencies-A.csv \
      segmented-lists/CC-List-SpecialistAgencies-B.csv
```

Expected: A-tiers ~500-1000 each, B-tiers ~2000-3500 each.

- [ ] **Step 5: Commit**

```bash
git add scripts/campaigns/verify-and-dedupe-niche-2026.py \
        segmented-lists/CC-List-RetainedRecruiters-A.csv \
        segmented-lists/CC-List-RetainedRecruiters-B.csv \
        segmented-lists/CC-List-SpecialistAgencies-A.csv \
        segmented-lists/CC-List-SpecialistAgencies-B.csv
git commit -m "feat(campaigns): verify + dedupe niche-2026 final lists"
```

---

## Task 11: Author the 4 sequence JSONs

**Files:**
- Create: `scripts/campaigns/sequences/niche-2026-sequences.json`

- [ ] **Step 1: Write the sequence file**

Create `scripts/campaigns/sequences/niche-2026-sequences.json`. Four sequences keyed by campaign name. 5 steps each (Day 1 [2 variants], Day 3, Day 7, Day 11, Day 17). Tier A includes signal-aware opener variants; Tier B uses category-level frames. Rules: zero em dashes, zero exclamations, spintax everywhere, vars `{{firstName}} {{companyName}} {{industryNiche}} {{senderFirst}}`.

```json
{
  "CC-List-RetainedRecruiters-A": {
    "niche_default": "executive search",
    "steps": [
      {"delay": 0, "variants": [
        {"subject": "{noticed {{companyName}}'s BD hire|{{firstName}}, quick thought on {{companyName}}|the BD role at {{companyName}}}",
         "body": "{Hey|Hi} {{firstName}},\n\n{Saw|Noticed|Caught} that {{companyName}} {is hiring|just posted} for a {business development role|partner-track role on the BD side}.\n\n{Most retained firms|Almost every executive search firm I work with} hire a BD person {expecting referrals to fill the desk|hoping the network will keep them busy}. {It rarely works.|That math almost never holds.}\n\nI run cold email systems for retained search firms that {sit alongside your BD hire|fill the calendar so they can focus on closing}, {generating qualified search opportunities every week|surfacing companies that are actively scaling and need senior placements}.\n\n{Worth a quick look at what this could mean for {{companyName}}?|Want me to map out what the search opportunity looks like in your market?|Open to a 15 min walkthrough?}\n\n{{senderFirst}}"},
        {"subject": "{filling {{companyName}}'s pipeline alongside your new BD|{{firstName}}, one idea|the executive-search math}",
         "body": "{Hey|Hi} {{firstName}},\n\n{Ran across {{companyName}}|Took a look at {{companyName}}} and {a lot of the work in {{industryNiche}}|the practice you've built}.\n\nQuick observation: {scaling a retained search firm via BD hire only works|the BD-hire model only pays off} {when there's a steady inbound funnel of qualified searches|when prospect flow is already there}.\n\n{I build that funnel for retained firms|That's what I do for boutique search}, {separate from your BD person's existing efforts|without stepping on your internal BD}.\n\n{Open to a quick look at what this could produce for {{companyName}}?|Interested in seeing what your prospect pool looks like?}\n\n{{senderFirst}}"}
      ]},
      {"delay": 3, "variants": [{"subject": "", "body": "{{firstName}}, {quick bump on this|following up}.\n\n{The pattern I see|What surprises most managing partners}: hiring BD without a prospect engine is {the most expensive way to grow|the slowest path to scaling a search practice}.\n\n{Does this line up with what you're seeing at {{companyName}}?|Is the new BD person hitting the ground running, or still ramping?|Where does {{companyName}} stand on prospect flow right now?}\n\n{{senderFirst}}"}]},
      {"delay": 4, "variants": [{"subject": "", "body": "{{firstName}}, {quick note on|here's} how this works for retained firms in practice:\n\nI {set up|build} {dedicated cold email infrastructure for {{companyName}}|a complete outbound system, separate from your main domain}. {Micro-targeted sequences|Personalized outreach} hitting {Heads of People, CHROs, and CEOs at companies actively scaling|the exact buyers who need senior placements}.\n\n{You and your BD team take the calls.|Your team closes. I keep the calendar full.}\n\n{Want me to walk through what this looks like for {{companyName}}?|Open to a 15 min look at what this could mean for your practice?}\n\n{{senderFirst}}"}]},
      {"delay": 4, "variants": [{"subject": "", "body": "{{firstName}}, {honest question|genuinely curious}: is {growing the search pipeline|expanding {{companyName}}'s client base} a priority right now, or is the {focus elsewhere|timing off}?\n\n{Just want to make sure I'm not cluttering your inbox.|Either way is fine.}\n\n{{senderFirst}}"}]},
      {"delay": 6, "variants": [{"subject": "", "body": "{{firstName}}, {last note|wrapping this thread}.\n\n{If timing is off, no worries.|Totally get if the focus is elsewhere right now.} {Wanted to leave the door open for when {{companyName}}'s ready to put more structure around new client acquisition.|If retained-search prospect flow ever moves up the priority list, I'm here.}\n\n{Best of luck with the new BD hire.|Hope the practice keeps growing.}\n\n{{senderFirst}}"}]}
    ]
  },

  "CC-List-RetainedRecruiters-B": {
    "niche_default": "executive search",
    "steps": [
      {"delay": 0, "variants": [
        {"subject": "{quick thought on {{companyName}}|{{firstName}}, retained-search question|the pipeline math at {{companyName}}}",
         "body": "{Hey|Hi} {{firstName}},\n\n{Ran across|Noticed|Came across} {{companyName}} {and the work you're doing in {{industryNiche}}|in the executive search space}.\n\n{Quick question|Curious} - how much of {{companyName}}'s search pipeline is {referrals vs. a repeatable system|relationship-driven}?\n\nMost retained firms I talk to are {80%+ referral-dependent|almost entirely network-driven}. {Works great until a slow quarter hits.|Fine until two big clients stop hiring at the same time.}\n\nI run cold email systems built for retained search that {put qualified search opportunities in front of you every week|surface companies actively scaling and likely to need senior hires}.\n\n{How is {{companyName}} handling new client acquisition outside of referrals?|What does the prospect pipeline look like for {{companyName}} right now?}\n\n{{senderFirst}}"},
        {"subject": "{free pipeline audit for {{companyName}}|{{firstName}}, quick idea|{{companyName}}'s outbound opportunity}",
         "body": "{Hey|Hi} {{firstName}},\n\n{Spent time on|Looked into} the executive search space and {{companyName}} caught my eye.\n\nI build free pipeline audits for retained search firms - {mapping out how many qualified companies in your market are actively scaling and likely to need senior placements|showing the outbound opportunity specific to your practice}.\n\n{Takes me about 30 minutes and it's yours whether we work together or not.|Free, no strings.}\n\n{Want me to build one for {{companyName}}?|If it'd be useful, I can put one together this week.}\n\n{{senderFirst}}"}
      ]},
      {"delay": 3, "variants": [{"subject": "", "body": "{{firstName}}, {quick follow-up|bumping this up}.\n\n{The pattern I keep seeing|What prompted my note}: most retained firms {{{companyName}}'s size|at your stage} are leaving {real search volume|a meaningful number of placements} on the table by not running outbound.\n\n{Referrals are great. Just not a system.|Not a knock on referrals. Just a gap I see constantly.}\n\n{Does this resonate at all?|Any of this ring true for {{companyName}}?}\n\n{{senderFirst}}"}]},
      {"delay": 4, "variants": [{"subject": "", "body": "{{firstName}}, {quick note on|here's} how this works in practice:\n\nI {set up|build} {dedicated cold email infrastructure for {{companyName}}|a complete outbound system, separate from your main domain}. {Sequences targeting Heads of People, CHROs, and CEOs at companies actively scaling|Outreach to the buyers who need senior placements}.\n\n{You take the calls. I handle the rest.|You focus on the searches. The pipeline runs in the background.}\n\n{Want me to walk through what this looks like for {{companyName}}?|Open to seeing what the prospect pool looks like in your market?}\n\n{{senderFirst}}"}]},
      {"delay": 4, "variants": [{"subject": "", "body": "{{firstName}}, {honest question|genuinely curious}: is {growing the search pipeline|new client acquisition} a priority for {{companyName}} right now, or is the {focus elsewhere|timing off}?\n\n{Just want to make sure I'm not cluttering your inbox.|Either way is fine.}\n\n{{senderFirst}}"}]},
      {"delay": 6, "variants": [{"subject": "", "body": "{{firstName}}, {last note|wrapping this thread}.\n\n{If timing is off, no worries.|Totally get if the focus is elsewhere right now.} {Wanted to leave the door open.|If pipeline ever moves up the priority list, I'm here.}\n\n{Best of luck with the practice.|Hope the year keeps going well for {{companyName}}.}\n\n{{senderFirst}}"}]}
    ]
  },

  "CC-List-SpecialistAgencies-A": {
    "niche_default": "specialist B2B agency",
    "steps": [
      {"delay": 0, "variants": [
        {"subject": "{the AE hire at {{companyName}}|{{firstName}}, scaling delivery before pipeline|noticed {{companyName}}'s growth}",
         "body": "{Hey|Hi} {{firstName}},\n\n{Saw|Noticed|Caught} that {{companyName}} {is hiring|just posted} for an {Account Executive|Account Director|Senior Strategist} role.\n\n{Scaling delivery before scaling pipeline is the agency death loop|Hiring delivery talent ahead of pipeline is the most common way specialist agencies stall}. {New AE rents desk space until there are accounts to manage.|That seat sits expensive until the funnel catches up.}\n\nI run cold email systems for specialist B2B agencies that {fill the calendar so your new hire ramps fast|put qualified prospects in front of you while you scale delivery}.\n\n{Worth a quick look at what this could mean for {{companyName}}?|Open to a 15 min walkthrough of what this could produce for an agency your size?}\n\n{{senderFirst}}"},
        {"subject": "{feeding {{companyName}}'s new hire|{{firstName}}, one idea on the AE bet|{{companyName}}'s ramp problem}",
         "body": "{Hey|Hi} {{firstName}},\n\n{Took a look at|Ran across} {{companyName}} and {the {{industryNiche}} work you're doing|the specialist positioning you've built}.\n\nQuick observation: {hiring an AE without a prospect engine|adding delivery capacity without a pipeline engine} {is the most expensive way to scale a specialist agency|tends to compress margin instead of expand it}.\n\n{That's what I solve for agencies in your category|I build the pipeline engine that makes the new hire pay back fast}, {separate from your existing referral channel|without competing with inbound}.\n\n{Open to seeing what this looks like for {{companyName}}?|Interested in a quick map of your prospect pool?}\n\n{{senderFirst}}"}
      ]},
      {"delay": 3, "variants": [{"subject": "", "body": "{{firstName}}, {quick bump|following up}.\n\n{The pattern I see across specialist agencies|What surprises most agency founders}: AE hires don't pay back in months 1-6 unless there's a steady outbound funnel feeding them.\n\n{Where does {{companyName}} stand on prospect flow right now?|Is the new role ramping into a full pipeline, or building it from scratch?}\n\n{{senderFirst}}"}]},
      {"delay": 4, "variants": [{"subject": "", "body": "{{firstName}}, {here's how this works for specialist agencies in practice|quick note on the system}:\n\nI {set up|build} {dedicated cold email infrastructure for {{companyName}}|a complete outbound system, separate from your main domain}. {Sequences targeting the exact decision-makers who buy specialist {{industryNiche}} services|Personalized outreach to RevOps leaders, CMOs, and Heads of Growth at companies that need what you do}.\n\n{Your AE works the inbound calendar. I keep it full.|You focus on delivery. The pipeline runs in the background.}\n\n{Want me to walk through what this looks like for {{companyName}}?|Open to a 15 min look?}\n\n{{senderFirst}}"}]},
      {"delay": 4, "variants": [{"subject": "", "body": "{{firstName}}, {honest question|genuinely curious}: is {filling pipeline for the new role|growing the agency's prospect engine} a priority right now, or is the {focus elsewhere|timing off}?\n\n{Just want to make sure I'm not cluttering your inbox.|Either way is fine.}\n\n{{senderFirst}}"}]},
      {"delay": 6, "variants": [{"subject": "", "body": "{{firstName}}, {last note|wrapping this thread}.\n\n{If timing is off, no worries.|Totally get if delivery is the priority right now.} {Wanted to leave the door open for when pipeline moves up the list.|If the AE ramp gets bumpy, I'm here.}\n\n{Best of luck with the new hire.|Hope the year keeps going well for {{companyName}}.}\n\n{{senderFirst}}"}]}
    ]
  },

  "CC-List-SpecialistAgencies-B": {
    "niche_default": "specialist B2B agency",
    "steps": [
      {"delay": 0, "variants": [
        {"subject": "{quick thought on {{companyName}}|{{firstName}}, agency pipeline question|the {{industryNiche}} agency math}",
         "body": "{Hey|Hi} {{firstName}},\n\n{Ran across|Noticed|Came across} {{companyName}} {and the {{industryNiche}} work|in the specialist B2B agency space}.\n\n{Quick question|Curious} - how much of {{companyName}}'s pipeline is {referrals vs. a repeatable system|relationship-driven}?\n\nMost specialist agencies I talk to are {80%+ referral-dependent|almost entirely network-driven}. {Works great until a slow quarter hits.|Fine until a big client churns and there's nothing behind it.}\n\nI run cold email systems built specifically for specialist B2B agencies that {put qualified prospects on your calendar every week|surface the exact decision-makers who buy specialist {{industryNiche}} services}.\n\n{How is {{companyName}} handling new business outside of referrals?|What does the prospect pipeline look like for {{companyName}} right now?}\n\n{{senderFirst}}"},
        {"subject": "{free pipeline audit for {{companyName}}|{{firstName}}, quick idea|{{companyName}}'s outbound opportunity}",
         "body": "{Hey|Hi} {{firstName}},\n\n{Spent time on|Looked into} the specialist {{industryNiche}} agency space and {{companyName}} caught my eye.\n\nI build free pipeline audits for specialist B2B agencies - {mapping out how many qualified companies in your market are likely to need {{industryNiche}} services|showing the outbound opportunity specific to your positioning}.\n\n{Takes me about 30 minutes and it's yours whether we work together or not.|Free, no strings.}\n\n{Want me to build one for {{companyName}}?|If it'd be useful, I can put one together this week.}\n\n{{senderFirst}}"}
      ]},
      {"delay": 3, "variants": [{"subject": "", "body": "{{firstName}}, {quick follow-up|bumping this up}.\n\n{The pattern I keep seeing|What prompted my note}: most specialist agencies {{{companyName}}'s size|at your stage} are leaving {real pipeline|a lot of meetings} on the table by not running outbound.\n\n{Referrals are great. Just not a system.|Not a knock on referrals. Just a gap I see constantly.}\n\n{Does this resonate at all?|Any of this ring true for {{companyName}}?}\n\n{{senderFirst}}"}]},
      {"delay": 4, "variants": [{"subject": "", "body": "{{firstName}}, {quick note on|here's} how this works in practice:\n\nI {set up|build} {dedicated cold email infrastructure for {{companyName}}|a complete outbound system, separate from your main domain}. {Sequences targeting decision-makers who buy specialist {{industryNiche}} services|Outreach to the exact buyers your agency was built to serve}.\n\n{You take the calls. I handle the rest.|You focus on delivery. The pipeline runs in the background.}\n\n{Want me to walk through what this looks like for {{companyName}}?|Open to seeing what the prospect pool looks like?}\n\n{{senderFirst}}"}]},
      {"delay": 4, "variants": [{"subject": "", "body": "{{firstName}}, {honest question|genuinely curious}: is {new client acquisition|growing {{companyName}}'s prospect engine} a priority right now, or is the {focus elsewhere|timing off}?\n\n{Just want to make sure I'm not cluttering your inbox.|Either way is fine.}\n\n{{senderFirst}}"}]},
      {"delay": 6, "variants": [{"subject": "", "body": "{{firstName}}, {last note|wrapping this thread}.\n\n{If timing is off, no worries.|Totally get if the focus is elsewhere right now.} {Wanted to leave the door open.|If pipeline ever moves up the priority list, I'm here.}\n\n{Best of luck with the agency.|Hope the year keeps going well for {{companyName}}.}\n\n{{senderFirst}}"}]}
    ]
  }
}
```

- [ ] **Step 2: Validate sequence rules**

```bash
# Zero em dashes:
grep -c -- "—" scripts/campaigns/sequences/niche-2026-sequences.json
# Expected: 0
# Zero exclamations (excluding any inside escaped strings):
python3 -c "import json; d=json.load(open('scripts/campaigns/sequences/niche-2026-sequences.json'));
import re
for c, cfg in d.items():
    for i, step in enumerate(cfg['steps']):
        for j, v in enumerate(step['variants']):
            blob = v['subject'] + v['body']
            if '!' in blob: print(f'{c} step {i} variant {j}: EXCLAMATION FOUND')
            if '—' in blob: print(f'{c} step {i} variant {j}: EM DASH FOUND')
print('OK' if True else 'FAIL')"
```

Expected: no FOUND lines, just `OK`.

- [ ] **Step 3: Validate spintax shape**

```bash
python3 -c "import json, re
d = json.load(open('scripts/campaigns/sequences/niche-2026-sequences.json'))
errs = 0
for c, cfg in d.items():
    for i, step in enumerate(cfg['steps']):
        for j, v in enumerate(step['variants']):
            blob = v['subject'] + v['body']
            # All { must pair with matching close }
            depth = 0
            for ch in blob:
                if ch == '{': depth += 1
                elif ch == '}': depth -= 1
                if depth < 0: print(f'{c} step{i} var{j}: unbalanced }}'); errs += 1; break
            if depth != 0: print(f'{c} step{i} var{j}: unbalanced spintax ({depth})'); errs += 1
print(f'errors: {errs}')"
```

Expected: `errors: 0`.

- [ ] **Step 4: Commit**

```bash
git add scripts/campaigns/sequences/niche-2026-sequences.json
git commit -m "feat(campaigns): author 4 niche-2026 sequences (Tier A + B per niche)"
```

---

## Task 12: Create 4 Instantly campaigns + attach sequences

**Files:**
- Create: `scripts/campaigns/setup-niche-2026-campaigns.py`

- [ ] **Step 1: Read the existing setup script for pattern**

```bash
sed -n '1,200p' /Users/matt/Documents/coldcrafthq/scripts/campaigns/setup-plan-campaigns.py
```

Note the API calls, schedule object shape, and how it attaches sending accounts.

- [ ] **Step 2: Write the new setup script**

Create `scripts/campaigns/setup-niche-2026-campaigns.py`. The skeleton below mirrors `setup-plan-campaigns.py` exactly — copy that script's API-call functions (create_campaign, add_sequence, attach_accounts) and only change the CAMPAIGNS dict and the SEQUENCES source:

```python
#!/usr/bin/env python3
"""Create 4 niche-2026 Instantly campaigns + attach sequences.
Schedule + send rules match V9 lockdown:
  - Mon-Fri, 07:00-10:30 ET
  - 30/day per inbox
  - stop_on_reply, text_only, no link tracking
  - zero em dashes, zero exclamation marks (validated upstream in Task 11)

NOTE on the helper functions below: the existing setup-plan-campaigns.py is
hyphenated and not importable as a Python module. Copy the three helper
functions (create_campaign, add_sequence, attach_accounts) inline from
setup-plan-campaigns.py into this script. This is intentional duplication —
these are one-shot orchestration scripts, not a shared library.
"""
import json
import os
import sys

# >>> COPY create_campaign, add_sequence, attach_accounts FROM setup-plan-campaigns.py HERE <<<
# Read them directly:
#   sed -n '/^def create_campaign/,/^def add_sequence/p' scripts/campaigns/setup-plan-campaigns.py
#   sed -n '/^def add_sequence/,/^def attach_accounts/p' scripts/campaigns/setup-plan-campaigns.py
#   sed -n '/^def attach_accounts/,/^def /p' scripts/campaigns/setup-plan-campaigns.py
# Paste them verbatim. Also copy the API_KEY loader (the .env.prod parsing block at the top).

ROOT = os.path.expanduser('~/Documents/coldcrafthq')

CAMPAIGNS = {
    "CC-List-RetainedRecruiters-A": {
        "csv": "CC-List-RetainedRecruiters-A.csv",
        "accounts": [
            # Pick a domain pool not used by the original 14 campaigns. Confirm
            # which accounts have spare capacity via list_sending_accounts.
            "matt.m@reach-coldcrafthq.com", "matt@reach-coldcrafthq.com",
            "matthew@reach-coldcrafthq.com",
        ],
        "niche_default": "executive search",
    },
    "CC-List-RetainedRecruiters-B": {
        "csv": "CC-List-RetainedRecruiters-B.csv",
        "accounts": [
            "matt.m@send-coldcrafthq.com", "matt@send-coldcrafthq.com",
            "matthew@send-coldcrafthq.com",
        ],
        "niche_default": "executive search",
    },
    "CC-List-SpecialistAgencies-A": {
        "csv": "CC-List-SpecialistAgencies-A.csv",
        "accounts": [
            "matt.m@hi-coldcrafthq.com", "matt@hi-coldcrafthq.com",
            "matthew@hi-coldcrafthq.com",
        ],
        "niche_default": "specialist B2B agency",
    },
    "CC-List-SpecialistAgencies-B": {
        "csv": "CC-List-SpecialistAgencies-B.csv",
        "accounts": [
            "matt.m@try-coldcrafthq.com", "matt@try-coldcrafthq.com",
            "matthew@try-coldcrafthq.com",
        ],
        "niche_default": "specialist B2B agency",
    },
}

SEQUENCES = json.load(open(f'{ROOT}/scripts/campaigns/sequences/niche-2026-sequences.json'))

SCHEDULE = {
    "name": "ColdCraft Default",
    "timing": {"from": "07:00", "to": "10:30"},
    "days": {"0": False, "1": True, "2": True, "3": True, "4": True, "5": True, "6": False},
    "timezone": "America/New_York",
}

OPTIONS = {
    "daily_limit": 30,
    "stop_on_reply": True,
    "stop_on_auto_reply": True,
    "link_tracking": False,
    "open_tracking": False,
    "text_only": True,
}

def main() -> int:
    for name, cfg in CAMPAIGNS.items():
        print(f'\n--- {name} ---')
        cid = create_campaign(name=name, schedule=SCHEDULE, options=OPTIONS)
        print(f'  campaign id: {cid}')
        add_sequence(cid, SEQUENCES[name]['steps'])
        attach_accounts(cid, cfg['accounts'])
        print(f'  done (paused, awaiting lead push)')
    return 0

if __name__ == '__main__':
    sys.exit(main())
```

> NOTE on sending accounts: do NOT reuse the same pools as the existing 14 campaigns — that would double-up sends from the same inbox and burn deliverability. Before running, confirm 4 unused domain pools exist (3 inboxes each = 360/day total send rate for niche-2026), or warm new ones.

- [ ] **Step 3: Dry-run validate (don't hit the API yet)**

```bash
cd /Users/matt/Documents/coldcrafthq
python3 -c "
import json
seq = json.load(open('scripts/campaigns/sequences/niche-2026-sequences.json'))
assert set(seq.keys()) == {
    'CC-List-RetainedRecruiters-A',
    'CC-List-RetainedRecruiters-B',
    'CC-List-SpecialistAgencies-A',
    'CC-List-SpecialistAgencies-B',
}, 'sequence names do not match campaign names'
for k, v in seq.items():
    assert len(v['steps']) == 5, f'{k} has {len(v[\"steps\"])} steps, expected 5'
print('sequence/campaign alignment OK')
"
```

Expected: `sequence/campaign alignment OK`.

- [ ] **Step 4: Run setup against Instantly**

```bash
python3 scripts/campaigns/setup-niche-2026-campaigns.py
```

Expected: 4 campaigns created (paused), each with 5-step sequence attached and 3 sending accounts each.

- [ ] **Step 5: Commit**

```bash
git add scripts/campaigns/setup-niche-2026-campaigns.py
git commit -m "feat(campaigns): create 4 niche-2026 Instantly campaigns + sequences"
```

---

## Task 13: Push leads into the 4 Instantly campaigns

**Files:**
- Create: `scripts/campaigns/push-niche-2026-leads.py`

- [ ] **Step 1: Read existing import pattern**

```bash
sed -n '1,150p' /Users/matt/Documents/coldcrafthq/scripts/campaigns/import-leads-v2.py
```

- [ ] **Step 2: Write the push script**

Create `scripts/campaigns/push-niche-2026-leads.py`:

```python
#!/usr/bin/env python3
"""Upload the 4 niche-2026 segmented CSVs into their matching Instantly campaigns.
Mirrors import-leads-v2.py pattern.
"""
import csv
import os
import subprocess
import sys

ROOT = os.path.expanduser('~/Documents/coldcrafthq')

MAPPING = [
    ('CC-List-RetainedRecruiters-A', 'CC-List-RetainedRecruiters-A.csv', 'executive search'),
    ('CC-List-RetainedRecruiters-B', 'CC-List-RetainedRecruiters-B.csv', 'executive search'),
    ('CC-List-SpecialistAgencies-A', 'CC-List-SpecialistAgencies-A.csv', 'specialist B2B agency'),
    ('CC-List-SpecialistAgencies-B', 'CC-List-SpecialistAgencies-B.csv', 'specialist B2B agency'),
]

def main() -> int:
    os.chdir(ROOT)
    for campaign_name, csv_name, default_niche in MAPPING:
        csv_path = f'{ROOT}/segmented-lists/{csv_name}'
        if not os.path.exists(csv_path):
            print(f'[skip] {csv_path} missing')
            continue
        print(f'\n--- pushing {csv_name} -> {campaign_name} ---')
        # Invoke the existing import script with the new campaign name.
        # Confirm exact args from import-leads-v2.py:
        cmd = ['python3', 'scripts/campaigns/import-leads-v2.py',
               f'--csv={csv_path}',
               f'--campaign={campaign_name}',
               f'--niche-default={default_niche}']
        r = subprocess.run(cmd)
        if r.returncode != 0:
            print(f'  [error] import failed for {campaign_name}', file=sys.stderr)
            return r.returncode
    return 0

if __name__ == '__main__':
    sys.exit(main())
```

> If `import-leads-v2.py` does not accept those flags, adapt them to match its actual CLI surface (read it in Step 1).

- [ ] **Step 3: Run it**

```bash
cd /Users/matt/Documents/coldcrafthq
python3 scripts/campaigns/push-niche-2026-leads.py
```

Expected: 4 imports complete, each printing the count of leads attached.

- [ ] **Step 4: Verify via Instantly dashboard or API**

Use the Instantly MCP tool from the conversation, or curl:

```bash
set -a && source .env.prod && set +a
curl -s -H "Authorization: Bearer $INSTANTLY_API_KEY" \
  "https://api.instantly.ai/api/v2/campaigns?search=niche-2026" | jq '.[].name,.[].leads_count' 2>/dev/null \
  || echo "manually verify in dashboard"
```

Expected: 4 campaigns visible with non-zero lead counts.

- [ ] **Step 5: Commit**

```bash
git add scripts/campaigns/push-niche-2026-leads.py
git commit -m "feat(campaigns): push niche-2026 segmented lists into Instantly"
```

---

## Task 14: Manual QA + unpause

**Files:** none — operational checklist.

- [ ] **Step 1: Spot-check 10 leads per campaign**

For each of the 4 campaigns, in Instantly:
- Open the lead list
- Pick 10 random rows
- Verify: real-looking email, plausible decision-maker title, company is in-niche
- Reject ratio target: <10%. If higher, lists need re-filtering before unpause.

- [ ] **Step 2: Send 2 test emails to yourself per campaign**

In Instantly, use "Send test" for Day 1 step. For each campaign, send variant 1 + variant 2 to your own inbox. Verify in the received emails:
- No em dashes
- No exclamation marks
- All `{{firstName}}` / `{{companyName}}` / `{{industryNiche}}` / `{{senderFirst}}` resolve
- Spintax expands (no `{...|...}` blobs visible)

- [ ] **Step 3: Verify sequence schedule**

For each campaign, confirm:
- Days: Mon-Fri only
- Time window: 07:00-10:30 ET
- Daily limit: 30
- Stop on reply: ON
- Link tracking: OFF
- Open tracking: OFF (per V9 deliverability lock)
- Text only: ON

- [ ] **Step 4: Unpause campaigns**

In the Instantly dashboard, set status to "Active" on all 4 campaigns. (No script — manual step gates the live-send moment.)

- [ ] **Step 5: Log the launch**

Append a launch-log row to `docs/niche-2026/launch-log.md` (create the file if it doesn't exist):

```markdown
# Niche-2026 Launch Log

## 2026-05-26
- 4 campaigns launched: RetainedRecruiters-A, RetainedRecruiters-B, SpecialistAgencies-A, SpecialistAgencies-B
- Total leads pushed: [fill from Task 13 output]
- Sending pool: [list domain pools used]
- First reply expected by: ~2026-05-29
- Tier-A vs Tier-B reply-rate comparison: scheduled review 2026-06-05 (Day 10)
```

Commit:

```bash
git add docs/niche-2026/launch-log.md
git commit -m "docs: log niche-2026 launch (4 campaigns live)"
```

---

## Post-launch (out of scope for this plan, tracked here for follow-up)

- **Day 7-10**: Review Tier A vs Tier B reply-rate divergence per niche via `signal-scoring-feedback`. If Tier A reply rate is <1.5× Tier B, the signal-scoring weights need revision.
- **Day 14**: If either niche reply rate is <1%, pause + diagnose (deliverability vs copy vs ICP via the coldiq-gtm three-lens check).
- **Day 30**: Re-verify any unsent leads (decay protection).
- **V10 follow-up**: Add LinkedIn DM channel on the same Tier A cohorts (multi-channel orchestration).

---

## Self-Review

**Spec coverage check:**
- Source from AI Ark (10K cap, US+CA) → Tasks 2-6 ✓
- Signal enrichment (indeed-jobs + headcount) → Task 7 ✓
- 100-pt scoring per ICP → Task 8 (module) + Task 9 (apply) ✓
- Tier A/B/Drop gates → Task 8 (`tier_for_score`) ✓
- MillionVerifier + dedupe vs 18K → Task 10 ✓
- 4 Tier A/B × 2 niche sequences → Task 11 ✓
- 4 Instantly campaigns w/ V9 schedule lock → Task 12 ✓
- Lead push → Task 13 ✓
- Manual QA + unpause → Task 14 ✓
- Learning loop (signal-scoring-feedback) → noted in post-launch ✓

**Placeholder scan:** "CONFIRM from Task 1" markers in the AI Ark client are explicit dependencies on the API-discovery task, not deferred details — the dependent task is named. Acceptable.

**Type consistency:** `searchLeads()` and `AIArkSearchParams` are used consistently across Tasks 2-4. `score_lead()` and `tier_for_score()` consistent across Tasks 8-9. CSV column names (`signal_job_post_hit`, `signal_headcount_hit`, `icp_score`, `icp_tier`) consistent across Tasks 7-10.
