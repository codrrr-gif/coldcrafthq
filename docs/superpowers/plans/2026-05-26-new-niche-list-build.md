# New-Niche List Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 4 Instantly campaigns (Tier A + B × 2 niches) targeting retained executive-search recruiters and specialist B2B agencies in US+CA, sourced via AI Ark (~5K credit budget, BounceBan-verified by AI Ark itself — no MillionVerifier needed), signal-enriched via existing modules, and scored with a niche-specific 100-pt matrix.

**Architecture:** Two-stage AI Ark pull — first a free `/people` metadata search (no credits, no emails), then `signal-enrich → score+tier-gate` runs on the metadata, then `/people/export` spends ~1 credit per BounceBan-verified email on ONLY Tier A + B survivors. Polling-based async (no webhook). Python orchestration scripts in `/scripts/campaigns/` chain stages, reading/writing CSVs at `/data/niche-2026/` for idempotency. One new TypeScript module `src/lib/sources/ai-ark.ts` exposes three primitives (`searchCompanies`, `searchPeople`, `exportPeopleWithEmail` + pollers). Niche-specific tier-gating implemented in a pure-Python module under `scripts/campaigns/lib/`.

**Tech Stack:** Next.js TS (existing app), Python 3 for orchestration (matches existing campaign scripts), AI Ark API (new source, `X-TOKEN` auth, base `https://api.ai-ark.com/api/developer-portal/v1`), Instantly API (existing client), Apify (existing scrapers via `signals/utils.ts`). Reacher VPS available for optional catch-all spot-check but not in critical path.

**Reference spec:** `docs/superpowers/specs/2026-05-25-new-niche-list-build-design.md`

**Reference API contract:** `docs/niche-2026/ai-ark-api-notes.md` (Task 1 output)

---

## File Structure

**New files:**
- `src/lib/sources/ai-ark.ts` — AI Ark API client (TS) exposing `searchCompanies`, `searchPeople`, `exportPeopleWithEmail`, `getExportStatistics`, `getExportInquiries`, `getCredits`
- `src/lib/sources/__tests__/ai-ark.test.ts` — unit tests
- `scripts/campaigns/ai-ark-cli.ts` — Node CLI wrapper (multi-command: `search-people`, `export-people`, `poll-export`, `fetch-export`, `credits`)
- `scripts/campaigns/lib/niche_scoring.py` — pure-Python niche-specific tier-gating
- `scripts/campaigns/lib/__init__.py`
- `scripts/campaigns/test_niche_scoring.py` — pytest for the scorer
- `scripts/campaigns/ai-ark-pull-retained-recruiters.py` — Stage 1 metadata pull (no credit spend)
- `scripts/campaigns/ai-ark-pull-specialist-agencies.py` — Stage 1 metadata pull (no credit spend)
- `scripts/campaigns/enrich-signals-niche-2026.py` — Stage 2
- `scripts/campaigns/score-and-tier-niche-2026.py` — Stage 3 (tier-split metadata CSVs)
- `scripts/campaigns/aiark-export-and-poll-niche-2026.py` — Stage 4 (spend credits on Tier A+B survivors; poll until DONE; fetch verified emails)
- `scripts/campaigns/dedupe-niche-2026.py` — Stage 5 (dedupe vs existing 18K; no separate verifier — BounceBan already ran)
- `scripts/campaigns/setup-niche-2026-campaigns.py` — Stage 6 (campaigns + sequences)
- `scripts/campaigns/push-niche-2026-leads.py` — Stage 6 (upload leads)
- `scripts/campaigns/sequences/niche-2026-sequences.json` — 4 sequence definitions
- `data/niche-2026/` — intermediate artifacts (gitignored)
- `docs/niche-2026/ai-ark-api-notes.md` — already created (Task 1 output)
- `segmented-lists/CC-List-RetainedRecruiters-A.csv`, `-B.csv`, `CC-List-SpecialistAgencies-A.csv`, `-B.csv` — final outputs

**Modified files:**
- `.env.prod` — append `AI_ARK_API=684348122e804576a29bcecadaf3da5b`
- `.gitignore` — add `/data/niche-2026/` if not already covered

---

## Task 1: Discover AI Ark API contract — ✅ DONE (commit `83b0a52`)

Findings live in `docs/niche-2026/ai-ark-api-notes.md`. Key load-bearing facts that all subsequent tasks must respect:

- **Base URL:** `https://api.ai-ark.com/api/developer-portal/v1`
- **Auth header:** `X-TOKEN: <raw key>` (NOT Bearer, NOT x-api-key — the docs are wrong about this)
- **Three primitives:** `POST /companies`, `POST /people` (metadata, no email, no credit cost), `POST /people/export` (async, BounceBan-verified emails, 1 credit per landed email)
- **No `verify_emails: false` toggle.** Emails always BounceBan-verified.
- **Async via polling:** `GET /people/export/{trackId}/statistics` for state, `GET /people/export/{trackId}/inquiries?page=N&size=100` for results. `webhook` is REQUIRED on POST but if we don't care about the webhook firing we can supply a dummy URL and just poll.
- **Credit balance:** 5,099.4 as of 2026-05-26 (`GET /payments/credits`). Plan assumes ~5K verified leads total ceiling.
- **Rate limits:** 5 req/s, 300/min, 18,000/hour per X-TOKEN.
- **Filter syntax:** geo uses full country names (`["United States", "Canada"]`); headcount uses `employeeSize: { type: "RANGE", range: [{start: 5, end: 75}] }`.

Skip to Task 2.

---

<details>
<summary>Original Task 1 steps (kept for audit trail — already executed)</summary>

- [x] **Step 1: Find the AI Ark documentation URL**

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

- [x] **Step 5: Commit the notes**

```bash
git add docs/niche-2026/ai-ark-api-notes.md
git commit -m "docs: capture AI Ark API contract for new-niche list build"
```

</details>

---

## Task 2: Build AI Ark TypeScript client

**Files:**
- Create: `src/lib/sources/ai-ark.ts`
- Test: `src/lib/sources/__tests__/ai-ark.test.ts`

This client exposes 6 functions matching the AI Ark contract from Task 1's notes (`docs/niche-2026/ai-ark-api-notes.md`):
- `getCredits()` — `GET /payments/credits` (read-only balance check)
- `searchCompanies(params)` — `POST /companies` (firmographic search, paginated)
- `searchPeople(params)` — `POST /people` (metadata only, no email, no credit cost, paginated)
- `exportPeopleWithEmail(params, webhook?)` — `POST /people/export` (async job, 1 credit per landed verified email)
- `getExportStatistics(trackId)` — `GET /people/export/{trackId}/statistics` (poll job state)
- `getExportInquiries(trackId, page, size)` — `GET /people/export/{trackId}/inquiries?page&size` (paged results)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/sources/__tests__/ai-ark.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCredits,
  searchPeople,
  exportPeopleWithEmail,
  getExportStatistics,
  getExportInquiries,
  type AIArkPeopleSearchParams,
} from '../ai-ark';

describe('ai-ark client', () => {
  beforeEach(() => {
    process.env.AI_ARK_API = 'test-key-123';
    global.fetch = vi.fn();
  });

  it('throws when API key is missing', async () => {
    delete process.env.AI_ARK_API;
    await expect(getCredits()).rejects.toThrow('AI_ARK_API not set');
  });

  it('uses X-TOKEN auth header with raw key (no Bearer prefix)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true, json: async () => ({ total: 5099.4 }),
    });
    await getCredits();
    const [, opts] = (global.fetch as any).mock.calls[0];
    expect(opts.headers['X-TOKEN']).toBe('test-key-123');
    expect(opts.headers.Authorization).toBeUndefined();
  });

  it('searchPeople sends documented body shape and paginates', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ id: 'p1', profile: { first_name: 'A' } }],
          totalElements: 2, totalPages: 2, last: false, number: 0,
          trackId: 'track-1',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ id: 'p2', profile: { first_name: 'B' } }],
          totalElements: 2, totalPages: 2, last: true, number: 1,
          trackId: 'track-1',
        }),
      });

    const params: AIArkPeopleSearchParams = {
      account: {
        industry: ['staffing and recruiting'],
        employeeSize: { type: 'RANGE', range: [{ start: 5, end: 75 }] },
        location: { country: ['United States', 'Canada'] },
      },
      contact: { current_position: { titles: ['Founder', 'Managing Partner'] } },
      size: 1,
      maxResults: 10,
    };
    const result = await searchPeople(params);

    expect(result.records).toHaveLength(2);
    expect(result.trackId).toBe('track-1');
    expect(global.fetch).toHaveBeenCalledTimes(2);

    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('api.ai-ark.com/api/developer-portal/v1/people');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.account.industry).toEqual(['staffing and recruiting']);
    expect(body.contact.current_position.titles).toContain('Founder');
    expect(body.page).toBe(0);
    expect(body.size).toBe(1);
  });

  it('exportPeopleWithEmail returns trackId from async POST', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ trackId: 'export-123', state: 'PENDING' }),
    });
    const trackId = await exportPeopleWithEmail({
      account: { industry: ['x'] }, contact: { current_position: { titles: ['CEO'] } }, size: 100,
    }, 'https://noop.example.com/webhook');
    expect(trackId).toBe('export-123');

    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/people/export');
    const body = JSON.parse(opts.body);
    expect(body.webhook).toBe('https://noop.example.com/webhook');
    expect(body.size).toBe(100);
  });

  it('getExportStatistics returns parsed state object', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ state: 'IN_PROGRESS', statistics: { total: 100, found: 42 } }),
    });
    const stats = await getExportStatistics('track-abc');
    expect(stats.state).toBe('IN_PROGRESS');
    expect(stats.statistics.found).toBe(42);
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toMatch(/\/people\/export\/track-abc\/statistics$/);
  });

  it('getExportInquiries pages through DONE results', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ refId: 'r1', state: 'DONE', input: { firstname: 'A' },
                    output: [{ address: 'a@x.com', status: 'VALID' }] }],
        totalElements: 1, totalPages: 1,
      }),
    });
    const page = await getExportInquiries('track-abc', 0, 100);
    expect(page.content).toHaveLength(1);
    expect(page.totalPages).toBe(1);
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toMatch(/\/people\/export\/track-abc\/inquiries\?page=0&size=100$/);
  });

  it('throws on non-OK status with response body in message', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false, status: 429, text: async () => 'rate limited',
    });
    await expect(getCredits()).rejects.toThrow(/429.*rate limited/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/matt/Documents/coldcrafthq
npx vitest run src/lib/sources/__tests__/ai-ark.test.ts
```

Expected: FAIL with "Cannot find module '../ai-ark'".

- [ ] **Step 3: Implement the client**

Create `src/lib/sources/ai-ark.ts`:

```typescript
// ============================================
// AI Ark API Client (api.ai-ark.com)
// ============================================
// Architecture (confirmed by Task 1 probing):
//   - searchPeople: free metadata search (no email, no credit cost)
//   - exportPeopleWithEmail: async job, ~1 credit per BounceBan-verified email
//   - Polling via getExportStatistics + getExportInquiries
// Auth: X-TOKEN: <raw key> (NOT Bearer, NOT x-api-key)
// Rate limits: 5 req/s, 300/min, 18000/hour per token
// ============================================

const API_BASE = 'https://api.ai-ark.com/api/developer-portal/v1';
const MAX_PAGE_SIZE_SEARCH = 100;    // /people and /companies cap
const MAX_PAGE_SIZE_EXPORT = 10_000; // /people/export single-job cap

function apiKey(): string {
  const key = process.env.AI_ARK_API;
  if (!key) throw new Error('AI_ARK_API not set');
  return key;
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-TOKEN': apiKey(),
  };
}

async function jsonOrThrow<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI Ark ${label} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

// ---- Types ----

export interface AIArkAccountFilter {
  industry?: string[];
  employeeSize?: { type: 'RANGE'; range: Array<{ start: number; end: number }> };
  location?: { country?: string[]; state?: string[]; city?: string[] };
  // Pass-through for additional documented fields:
  [key: string]: unknown;
}

export interface AIArkContactFilter {
  current_position?: { titles?: string[]; excluded_titles?: string[] };
  seniority?: string[];
  department?: string[];
  [key: string]: unknown;
}

export interface AIArkPeopleSearchParams {
  account?: AIArkAccountFilter;
  contact?: AIArkContactFilter;
  lists?: { people_id?: { exclude?: string[] }; company_id?: { exclude?: string[] } };
  size?: number;       // page size (capped at MAX_PAGE_SIZE_SEARCH for /people)
  maxResults?: number; // total ceiling across pages
}

export interface AIArkPersonRecord {
  id: string;
  identifier?: string;
  profile?: {
    first_name?: string; last_name?: string; full_name?: string;
    title?: string; headline?: string;
  };
  link?: { linkedin?: string | null };
  location?: {
    country?: string; state?: string; city?: string; default?: string;
  };
  industry?: string;
  position_groups?: Array<{
    company?: {
      id?: string; name?: string; url?: string;
      employees?: { start?: number; end?: number | null };
    };
    profile_positions?: Array<{ title?: string }>;
  }>;
  department?: { seniority?: string; functions?: string[] };
  [key: string]: unknown;
}

export interface AIArkPeopleSearchResult {
  records: AIArkPersonRecord[];
  totalElements: number;
  trackId: string | null;
}

export interface AIArkExportStatistics {
  state: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'FAILED' | string;
  statistics?: { total: number; found: number; [k: string]: unknown };
  [key: string]: unknown;
}

export interface AIArkExportInquiryRecord {
  refId: string;
  state: 'PENDING' | 'DONE' | 'FAILED' | string;
  input: { firstname?: string; lastname?: string; domain?: string };
  output: Array<{
    address: string;
    status: 'VALID' | 'INVALID' | 'UNKNOWN' | string;
    subStatus?: string;
    domainType?: 'SMTP' | 'CATCH_ALL' | string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface AIArkExportInquiriesPage {
  content: AIArkExportInquiryRecord[];
  totalElements: number;
  totalPages: number;
}

export interface AIArkCredits {
  total: number;
}

// ---- API ----

export async function getCredits(): Promise<AIArkCredits> {
  const res = await fetch(`${API_BASE}/payments/credits`, {
    method: 'GET',
    headers: headers(),
    signal: AbortSignal.timeout(15_000),
  });
  return jsonOrThrow<AIArkCredits>(res, 'getCredits');
}

export async function searchPeople(
  params: AIArkPeopleSearchParams,
): Promise<AIArkPeopleSearchResult> {
  const pageSize = Math.min(params.size ?? MAX_PAGE_SIZE_SEARCH, MAX_PAGE_SIZE_SEARCH);
  const maxResults = params.maxResults ?? 5_000;

  const records: AIArkPersonRecord[] = [];
  let page = 0;
  let totalElements = 0;
  let trackId: string | null = null;
  let last = false;

  while (records.length < maxResults && !last) {
    const remaining = maxResults - records.length;
    const body = {
      account: params.account ?? {},
      contact: params.contact ?? {},
      lists: params.lists,
      page,
      size: Math.min(pageSize, remaining),
    };
    const res = await fetch(`${API_BASE}/people`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await jsonOrThrow<{
      content?: AIArkPersonRecord[];
      totalElements?: number;
      totalPages?: number;
      last?: boolean;
      number?: number;
      trackId?: string;
    }>(res, 'searchPeople');

    const batch = data.content ?? [];
    records.push(...batch);
    totalElements = data.totalElements ?? totalElements;
    trackId = data.trackId ?? trackId;
    last = !!data.last || batch.length === 0;
    page += 1;

    if (batch.length === 0) break;
  }

  return { records: records.slice(0, maxResults), totalElements, trackId };
}

export interface AIArkExportParams extends AIArkPeopleSearchParams {
  // /people/export size cap is 10_000 in one job
  size?: number;
}

export async function exportPeopleWithEmail(
  params: AIArkExportParams,
  webhook: string,
): Promise<string> {
  const body = {
    account: params.account ?? {},
    contact: params.contact ?? {},
    lists: params.lists,
    page: 0,
    size: Math.min(params.size ?? MAX_PAGE_SIZE_EXPORT, MAX_PAGE_SIZE_EXPORT),
    webhook,
  };
  const res = await fetch(`${API_BASE}/people/export`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await jsonOrThrow<{ trackId: string; state?: string }>(res, 'exportPeopleWithEmail');
  if (!data.trackId) throw new Error('AI Ark export did not return a trackId');
  return data.trackId;
}

export async function getExportStatistics(trackId: string): Promise<AIArkExportStatistics> {
  const res = await fetch(
    `${API_BASE}/people/export/${encodeURIComponent(trackId)}/statistics`,
    { method: 'GET', headers: headers(), signal: AbortSignal.timeout(15_000) },
  );
  return jsonOrThrow<AIArkExportStatistics>(res, 'getExportStatistics');
}

export async function getExportInquiries(
  trackId: string,
  page = 0,
  size = 100,
): Promise<AIArkExportInquiriesPage> {
  const res = await fetch(
    `${API_BASE}/people/export/${encodeURIComponent(trackId)}/inquiries?page=${page}&size=${size}`,
    { method: 'GET', headers: headers(), signal: AbortSignal.timeout(30_000) },
  );
  return jsonOrThrow<AIArkExportInquiriesPage>(res, 'getExportInquiries');
}

export interface AIArkCompanySearchParams {
  account?: AIArkAccountFilter;
  lookalikeDomains?: string[];
  lists?: { company_id?: { exclude?: string[] } };
  size?: number;
  maxResults?: number;
}

export async function searchCompanies(
  params: AIArkCompanySearchParams,
): Promise<{ records: Array<Record<string, unknown>>; totalElements: number }> {
  const pageSize = Math.min(params.size ?? MAX_PAGE_SIZE_SEARCH, MAX_PAGE_SIZE_SEARCH);
  const maxResults = params.maxResults ?? 5_000;

  const records: Array<Record<string, unknown>> = [];
  let page = 0;
  let totalElements = 0;
  let last = false;

  while (records.length < maxResults && !last) {
    const remaining = maxResults - records.length;
    const body = {
      account: params.account ?? {},
      lookalikeDomains: params.lookalikeDomains ?? [],
      lists: params.lists,
      page,
      size: Math.min(pageSize, remaining),
    };
    const res = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await jsonOrThrow<{
      content?: Array<Record<string, unknown>>;
      totalElements?: number;
      last?: boolean;
    }>(res, 'searchCompanies');
    const batch = data.content ?? [];
    records.push(...batch);
    totalElements = data.totalElements ?? totalElements;
    last = !!data.last || batch.length === 0;
    page += 1;
    if (batch.length === 0) break;
  }

  return { records: records.slice(0, maxResults), totalElements };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/matt/Documents/coldcrafthq
npx vitest run src/lib/sources/__tests__/ai-ark.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/ai-ark.ts src/lib/sources/__tests__/ai-ark.test.ts
git commit -m "feat(sources): add AI Ark client (searchPeople/exportPeople/credits)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Build the Node CLI wrapper for Python orchestration

**Files:**
- Create: `scripts/campaigns/ai-ark-cli.ts`

Multi-command CLI so Python scripts can invoke any of the 6 AI Ark primitives via subprocess. Commands: `credits`, `search-people`, `export-people`, `poll-export`, `fetch-export`.

- [ ] **Step 1: Write the CLI**

Create `scripts/campaigns/ai-ark-cli.ts`:

```typescript
#!/usr/bin/env tsx
// Multi-command CLI wrapping the AI Ark TS client.
// Usage examples:
//   tsx ai-ark-cli.ts credits
//   tsx ai-ark-cli.ts search-people --params=path/to/params.json --out=path/to/metadata.csv
//   tsx ai-ark-cli.ts export-people --params=path/to/params.json --webhook=https://noop.example.com/wh
//   tsx ai-ark-cli.ts poll-export --track-id=<trackId>
//   tsx ai-ark-cli.ts fetch-export --track-id=<trackId> --out=path/to/verified.csv
import { readFileSync, writeFileSync } from 'node:fs';
import {
  getCredits, searchPeople, exportPeopleWithEmail,
  getExportStatistics, getExportInquiries,
  type AIArkPersonRecord,
  type AIArkExportInquiryRecord,
} from '../../src/lib/sources/ai-ark';

function arg(name: string, required = true): string | undefined {
  const found = process.argv.find(a => a.startsWith(`--${name}=`));
  if (!found) {
    if (required) throw new Error(`Missing --${name}=`);
    return undefined;
  }
  return found.split('=', 2)[1];
}

function escape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Flatten a person record into a single CSV row with stable columns.
function personRow(r: AIArkPersonRecord): Record<string, string> {
  const cur = r.position_groups?.[0]?.company;
  const curPos = r.position_groups?.[0]?.profile_positions?.[0];
  return {
    aiark_person_id: String(r.id ?? ''),
    first_name: String(r.profile?.first_name ?? ''),
    last_name: String(r.profile?.last_name ?? ''),
    full_name: String(r.profile?.full_name ?? ''),
    title: String(curPos?.title ?? r.profile?.title ?? ''),
    headline: String(r.profile?.headline ?? ''),
    linkedin_url: String(r.link?.linkedin ?? ''),
    company_name: String(cur?.name ?? ''),
    aiark_company_id: String(cur?.id ?? ''),
    company_linkedin_url: String(cur?.url ?? ''),
    company_headcount_start: String(cur?.employees?.start ?? ''),
    company_headcount_end: String(cur?.employees?.end ?? ''),
    company_industry: String(r.industry ?? ''),
    person_country: String(r.location?.country ?? ''),
    person_state: String(r.location?.state ?? ''),
    person_city: String(r.location?.city ?? ''),
    seniority: String(r.department?.seniority ?? ''),
  };
}

function rowsToCsv(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const header = cols.join(',');
  const body = rows.map(r => cols.map(c => escape(r[c])).join(',')).join('\n');
  return header + '\n' + body + '\n';
}

async function cmdCredits() {
  const c = await getCredits();
  console.log(JSON.stringify(c));
}

async function cmdSearchPeople() {
  const paramsPath = arg('params')!;
  const outPath = arg('out')!;
  const params = JSON.parse(readFileSync(paramsPath, 'utf8'));
  const result = await searchPeople(params);
  const rows = result.records.map(personRow);
  writeFileSync(outPath, rowsToCsv(rows));
  console.error(JSON.stringify({
    wrote: rows.length, totalElements: result.totalElements,
    trackId: result.trackId, out: outPath,
  }));
  // Also emit trackId on stdout (single line) so Python can capture it
  if (result.trackId) console.log(result.trackId);
}

async function cmdExportPeople() {
  const paramsPath = arg('params')!;
  const webhook = arg('webhook')!;
  const params = JSON.parse(readFileSync(paramsPath, 'utf8'));
  const trackId = await exportPeopleWithEmail(params, webhook);
  console.log(trackId);
}

async function cmdPollExport() {
  const trackId = arg('track-id')!;
  const stats = await getExportStatistics(trackId);
  console.log(JSON.stringify(stats));
}

// Flatten an inquiry record into a row joining input + first VALID output.
function inquiryRow(i: AIArkExportInquiryRecord): Record<string, string> | null {
  const valid = i.output.find(o => o.status === 'VALID');
  if (!valid) return null;
  return {
    refId: String(i.refId ?? ''),
    state: String(i.state ?? ''),
    email: String(valid.address ?? ''),
    email_status: String(valid.status ?? ''),
    email_substatus: String(valid.subStatus ?? ''),
    email_domain_type: String(valid.domainType ?? ''),
    first_name: String(i.input.firstname ?? ''),
    last_name: String(i.input.lastname ?? ''),
    company_domain: String(i.input.domain ?? ''),
  };
}

async function cmdFetchExport() {
  const trackId = arg('track-id')!;
  const outPath = arg('out')!;
  const all: Array<Record<string, string>> = [];
  let page = 0;
  while (true) {
    const data = await getExportInquiries(trackId, page, 100);
    for (const item of data.content ?? []) {
      const r = inquiryRow(item);
      if (r) all.push(r);
    }
    if (page + 1 >= (data.totalPages ?? 1)) break;
    page += 1;
  }
  writeFileSync(outPath, rowsToCsv(all));
  console.log(JSON.stringify({ wrote: all.length, out: outPath }));
}

async function main() {
  const cmd = process.argv[2];
  switch (cmd) {
    case 'credits':       return cmdCredits();
    case 'search-people': return cmdSearchPeople();
    case 'export-people': return cmdExportPeople();
    case 'poll-export':   return cmdPollExport();
    case 'fetch-export':  return cmdFetchExport();
    default:
      console.error(`Unknown command: ${cmd}`);
      console.error('Usage: ai-ark-cli.ts <credits|search-people|export-people|poll-export|fetch-export> [--flags...]');
      process.exit(2);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Type-check the CLI**

```bash
cd /Users/matt/Documents/coldcrafthq
npx tsc --noEmit scripts/campaigns/ai-ark-cli.ts src/lib/sources/ai-ark.ts
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/campaigns/ai-ark-cli.ts
git commit -m "feat(campaigns): add ai-ark-cli (search/export/poll/fetch/credits)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Smoke-test against live AI Ark API

**Files:**
- Create: `data/niche-2026/smoke-test-params.json`

This task validates the new client/CLI against the real API with the cheapest possible probes: a credits read (free) and a `size:5` `/people` metadata search (free, no credit cost — emails aren't returned by this endpoint).

- [ ] **Step 1: Confirm AI Ark key already in env file**

Verify (the key was added in Task 1's env work):

```bash
grep '^AI_ARK_API=' /Users/matt/Documents/coldcrafthq/.env.prod
```

Expected: `AI_ARK_API=684348122e804576a29bcecadaf3da5b`. If missing, append it.

- [ ] **Step 2: Add data dir to .gitignore**

Append to `/Users/matt/Documents/coldcrafthq/.gitignore` (if not already there):

```
/data/niche-2026/
```

Then create the dir:

```bash
mkdir -p /Users/matt/Documents/coldcrafthq/data/niche-2026
```

- [ ] **Step 3: Verify credits endpoint (free read)**

```bash
cd /Users/matt/Documents/coldcrafthq
set -a && source .env.prod && set +a
npx tsx scripts/campaigns/ai-ark-cli.ts credits
```

Expected: JSON like `{"total":5099.4}`. Record the current balance — this is what Task 10 will spend against.

- [ ] **Step 4: Write tiny smoke-test params (real /people schema)**

Create `data/niche-2026/smoke-test-params.json`:

```json
{
  "account": {
    "industry": ["staffing and recruiting"],
    "employeeSize": { "type": "RANGE", "range": [{ "start": 5, "end": 75 }] },
    "location": { "country": ["United States", "Canada"] }
  },
  "contact": {
    "current_position": {
      "titles": ["Managing Partner", "Founder", "Founding Partner"]
    }
  },
  "size": 5,
  "maxResults": 5
}
```

- [ ] **Step 5: Run the metadata smoke test**

```bash
cd /Users/matt/Documents/coldcrafthq
set -a && source .env.prod && set +a
npx tsx scripts/campaigns/ai-ark-cli.ts search-people \
  --params=data/niche-2026/smoke-test-params.json \
  --out=data/niche-2026/smoke-test.csv 2>&1
```

Expected: stderr line `{"wrote":5,"totalElements":N,"trackId":"<uuid>","out":"..."}` and stdout: a single trackId line.

- [ ] **Step 6: Inspect output**

```bash
head -2 data/niche-2026/smoke-test.csv
wc -l data/niche-2026/smoke-test.csv
```

Expected:
- Header includes `first_name, last_name, title, company_name, company_industry, person_country, linkedin_url, aiark_person_id`
- 6 lines total (1 header + 5 rows)
- Rows are real recruiting-firm partners/founders in US/CA

- [ ] **Step 7: Re-check credits did NOT decrement (metadata search is free)**

```bash
npx tsx scripts/campaigns/ai-ark-cli.ts credits
```

Expected: same balance as Step 3. If it dropped, something is wrong — STOP and investigate. The `/people` endpoint should never charge credits.

No commit — smoke artifact is gitignored.

---

## Task 5: Pull retained-recruiters METADATA from AI Ark `/people` (ICP-1, free)

**Files:**
- Create: `scripts/campaigns/ai-ark-pull-retained-recruiters.py`
- Create: `data/niche-2026/params-retained-recruiters.json`

This pull is **free** — `/people` returns metadata (name, title, company, LinkedIn, industry, location) with no emails and no credit cost. Emails come later in Task 10 only for the Tier A+B survivors.

- [ ] **Step 1: Write the params file**

Create `data/niche-2026/params-retained-recruiters.json` using the CORRECTED nested filter schema (Task 4 surfaced that Task 1's bare-array schema returns 400 — see `docs/niche-2026/ai-ark-api-notes.md`):

```json
{
  "page": 0,
  "size": 100,
  "maxResults": 5000,
  "account": {
    "industries": {
      "any": {
        "include": {
          "mode": "WORD",
          "content": [
            "staffing and recruiting",
            "executive search",
            "human resources services"
          ]
        }
      }
    },
    "employeeSize": {
      "type": "RANGE",
      "range": [{ "start": 5, "end": 75 }]
    },
    "location": {
      "any": { "include": ["United States", "Canada"] }
    }
  },
  "contact": {
    "experience": {
      "latest": {
        "title": {
          "any": {
            "include": {
              "mode": "SMART",
              "content": [
                "Managing Partner",
                "Founder",
                "Founding Partner",
                "Managing Director",
                "President",
                "Practice Lead",
                "VP Business Development",
                "Vice President Business Development"
              ]
            }
          }
        }
      }
    }
  }
}
```

> Note: AI Ark's `/people` filter exposes `exclude` arrays too, but we rely on the niche_scoring module (Task 8) for excluded titles (Recruiter, Sourcer, etc.) — those titles already return 0 score (hard gate). The verified ICP-1 universe at these filters is **~5,908** people (Task 4 probe); `maxResults: 5000` will pull essentially the entire universe. **Cost: ~2,500 credits at 0.5cr/record.**

- [ ] **Step 2: Write the Python wrapper**

Create `scripts/campaigns/ai-ark-pull-retained-recruiters.py`:

```python
#!/usr/bin/env python3
"""Stage 1 (recruiters): pull up to 5K METADATA records from AI Ark /people.
No credits spent (no emails returned). Output is a CSV of person metadata
joined with current-company metadata, ready for signal enrichment (Task 7)
and scoring (Task 9). Emails are fetched in Task 10 for survivors only.
"""
import os
import subprocess
import sys

ROOT = os.path.expanduser('~/Documents/coldcrafthq')
PARAMS = f'{ROOT}/data/niche-2026/params-retained-recruiters.json'
OUT = f'{ROOT}/data/niche-2026/metadata-recruiters.csv'

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
    cmd = ['npx', 'tsx', 'scripts/campaigns/ai-ark-cli.ts', 'search-people',
           f'--params={PARAMS}', f'--out={OUT}']
    print(f'Running: {" ".join(cmd)}')
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    # The CLI prints the trackId on stdout and a JSON summary on stderr.
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)
    return result.returncode

if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 3: Run it**

```bash
cd /Users/matt/Documents/coldcrafthq
python3 scripts/campaigns/ai-ark-pull-retained-recruiters.py
```

Expected: stderr summary `{"wrote":<N>,"totalElements":<universe>,"trackId":"...","out":"..."}` with N up to 5,000. Universe size for retained recruiters at this filter is likely 8K-30K — anything between 500 and 5,000 returned is acceptable.

- [ ] **Step 4: Verify the output**

```bash
wc -l data/niche-2026/metadata-recruiters.csv
head -2 data/niche-2026/metadata-recruiters.csv
```

Expected: 1 header row + N data rows. If N < 300, the ICP-1 filters are too tight — open the params JSON and relax (drop "Practice Lead", widen headcount to 5-100, add another industry term). If totalElements < 500 too, ICP is genuinely tiny — re-evaluate the spec with the user.

- [ ] **Step 5: Re-check credits did NOT change**

```bash
set -a && source .env.prod && set +a
npx tsx scripts/campaigns/ai-ark-cli.ts credits
```

Expected: same balance as before this task. If it dropped, STOP — `/people` should never spend credits. Open an issue.

- [ ] **Step 6: Commit the script + params**

```bash
git add scripts/campaigns/ai-ark-pull-retained-recruiters.py \
        data/niche-2026/params-retained-recruiters.json
git commit -m "feat(campaigns): Stage 1 metadata pull for retained recruiters (ICP-1)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

(The CSV itself is gitignored.)

---

## Task 6: Pull specialist-agencies METADATA from AI Ark `/people` (ICP-2, free)

**Files:**
- Create: `scripts/campaigns/ai-ark-pull-specialist-agencies.py`
- Create: `data/niche-2026/params-specialist-agencies.json`

Same shape as Task 5: free `/people` metadata pull, no credits spent, no emails yet. Specialist filtering (PR / RevOps / lifecycle / etc.) lives in the niche_scoring module (Task 8) — AI Ark doesn't expose keyword whitelist on `/people` directly, so we pull broad-industry candidates and let the scoring matrix do the specialist cut.

- [ ] **Step 1: Write the params file**

Create `data/niche-2026/params-specialist-agencies.json` (using the CORRECTED nested filter schema):

```json
{
  "page": 0,
  "size": 100,
  "maxResults": 5000,
  "account": {
    "industries": {
      "any": {
        "include": {
          "mode": "WORD",
          "content": [
            "public relations and communications",
            "marketing services",
            "advertising services",
            "management consulting"
          ]
        }
      }
    },
    "employeeSize": {
      "type": "RANGE",
      "range": [{ "start": 5, "end": 50 }]
    },
    "location": {
      "any": { "include": ["United States", "Canada"] }
    }
  },
  "contact": {
    "experience": {
      "latest": {
        "title": {
          "any": {
            "include": {
              "mode": "SMART",
              "content": [
                "Founder",
                "CEO",
                "Managing Director",
                "Managing Partner",
                "Head of New Business",
                "Head of Growth",
                "COO",
                "Chief Operating Officer"
              ]
            }
          }
        }
      }
    }
  }
}
```

**Cost: ~2,500 credits at 0.5cr/record.**

> The 4 broad industry codes cast wide. The niche_scoring module (Task 8) applies the agency-specialism cut via the `AGENCY_ICP.industry_match_keywords` whitelist (PR / RevOps / lifecycle / demand-gen / performance / B2B content / sales enablement / ABM / fractional CMO) AND the `industry_blacklist` (design studios / dev shops / branding studios). Anything not matching the whitelist falls below 90 score and out of Tier A; anything in the blacklist gets 0.

- [ ] **Step 2: Write the Python wrapper**

Create `scripts/campaigns/ai-ark-pull-specialist-agencies.py`:

```python
#!/usr/bin/env python3
"""Stage 1 (agencies): pull up to 5K METADATA records from AI Ark /people.
Casts wide on industry; specialist filtering happens in scoring (Task 9).
No credits spent.
"""
import os
import subprocess
import sys

ROOT = os.path.expanduser('~/Documents/coldcrafthq')
PARAMS = f'{ROOT}/data/niche-2026/params-specialist-agencies.json'
OUT = f'{ROOT}/data/niche-2026/metadata-agencies.csv'

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
    cmd = ['npx', 'tsx', 'scripts/campaigns/ai-ark-cli.ts', 'search-people',
           f'--params={PARAMS}', f'--out={OUT}']
    print(f'Running: {" ".join(cmd)}')
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)
    return result.returncode

if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 3: Run it**

```bash
cd /Users/matt/Documents/coldcrafthq
python3 scripts/campaigns/ai-ark-pull-specialist-agencies.py
```

Expected: stderr summary `{"wrote":<N>,...}` with N up to 5,000. The 4 broad industries should easily hit 5K total; if N < 1000, widen the industry list further.

- [ ] **Step 4: Verify the output**

```bash
wc -l data/niche-2026/metadata-agencies.csv
head -2 data/niche-2026/metadata-agencies.csv
```

Expected: 1 header row + N data rows.

- [ ] **Step 5: Re-check credits**

```bash
set -a && source .env.prod && set +a
npx tsx scripts/campaigns/ai-ark-cli.ts credits
```

Expected: same balance as before this task. If it dropped, STOP.

- [ ] **Step 6: Commit**

```bash
git add scripts/campaigns/ai-ark-pull-specialist-agencies.py \
        data/niche-2026/params-specialist-agencies.json
git commit -m "feat(campaigns): Stage 1 metadata pull for specialist agencies (ICP-2)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Signal enrichment (indeed-jobs + Apify LinkedIn headcount)

**Files:**
- Create: `scripts/campaigns/enrich-signals-niche-2026.py`

This script reads the two metadata CSVs from Tasks 5-6, calls existing signal modules per company, and appends 4 new columns: `signal_job_post_hit`, `signal_job_post_role`, `signal_headcount_delta_yoy`, `signal_headcount_hit`.

**Important column-name notes for the new metadata schema:**
- The metadata CSV does NOT contain `company_domain` (emails + domains come later in Task 10). Dedupe per-company calls by `aiark_company_id` instead.
- For signal modules that require a domain input, derive one from `company_linkedin_url` (parse the LinkedIn slug) OR look up the company via `searchCompanies` for the few hundred unique company IDs we need to enrich — but only if the existing signal modules can't accept a LinkedIn URL. Inspect first (Step 1 below).

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
        'in':  f'{ROOT}/data/niche-2026/metadata-recruiters.csv',
        'out': f'{ROOT}/data/niche-2026/signal-enriched-recruiters.csv',
        'job_role_keywords': ['business development', 'partner',
                              'director of business development'],
    },
    {
        'in':  f'{ROOT}/data/niche-2026/metadata-agencies.csv',
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

def call_signals_cli(linkedin_url: str, role_keywords: list[str], env: Dict[str, str]) -> Dict[str, Any]:
    """Invoke the signals CLI wrapper for one company by LinkedIn URL. Returns:
       {job_post_hit: bool, job_post_role: str, headcount_delta_yoy: float | None}
       On error: all defaults (False/empty/None) — never raise per-company.
    """
    if not linkedin_url:
        return {'job_post_hit': False, 'job_post_role': '', 'headcount_delta_yoy': None}
    try:
        cmd = ['npx', 'tsx', 'scripts/campaigns/signals-cli.ts',
               f'--linkedin-url={linkedin_url}',
               f'--job-keywords={",".join(role_keywords)}']
        r = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            print(f'  [warn] signals-cli {linkedin_url}: {r.stderr.strip()[:200]}', file=sys.stderr)
            return {'job_post_hit': False, 'job_post_role': '', 'headcount_delta_yoy': None}
        return json.loads(r.stdout)
    except Exception as e:
        print(f'  [warn] signals-cli {linkedin_url}: {e}', file=sys.stderr)
        return {'job_post_hit': False, 'job_post_role': '', 'headcount_delta_yoy': None}

def enrich(input_path: str, output_path: str, role_keywords: list[str], env: Dict[str, str]) -> None:
    with open(input_path, newline='') as f:
        rows = list(csv.DictReader(f))
    print(f'Enriching {len(rows)} rows from {input_path}')

    # Dedupe by AI Ark company UUID so we only call signals once per company.
    # (Domain isn't in the metadata; we'd have to enrich it separately.)
    company_keys = {(r.get('aiark_company_id') or '').strip()
                    for r in rows if r.get('aiark_company_id')}
    company_keys.discard('')
    # For each company UUID, look up its linkedin_url from the first matching row —
    # the signals-cli should accept either a domain or a LinkedIn URL.
    key_to_linkedin: Dict[str, str] = {}
    for r in rows:
        k = (r.get('aiark_company_id') or '').strip()
        if k and k not in key_to_linkedin:
            key_to_linkedin[k] = (r.get('company_linkedin_url') or '').strip()

    company_signals: Dict[str, Dict[str, Any]] = {}

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(call_signals_cli, key_to_linkedin[k], role_keywords, env): k
                   for k in company_keys}
        for i, fut in enumerate(as_completed(futures)):
            k = futures[fut]
            company_signals[k] = fut.result()
            if (i + 1) % 50 == 0:
                print(f'  signal progress: {i + 1}/{len(company_keys)}')

    # Attach signal columns to each row
    fieldnames = list(rows[0].keys()) + [
        'signal_job_post_hit', 'signal_job_post_role',
        'signal_headcount_delta_yoy', 'signal_headcount_hit'
    ]
    for r in rows:
        k = (r.get('aiark_company_id') or '').strip()
        s = company_signals.get(k, {})
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

The signal-enriched CSVs from Task 7 use the AI Ark metadata schema: `company_headcount_start`, `company_headcount_end`, `person_country`, etc. The `niche_scoring` module (Task 8) expects canonical names: `company_headcount` (int), `company_location` (string). This orchestrator does the mapping at the boundary so the scoring module stays simple.

- [ ] **Step 1: Write the orchestrator**

Create `scripts/campaigns/score-and-tier-niche-2026.py`:

```python
#!/usr/bin/env python3
"""Apply niche-specific scoring and split each signal-enriched CSV
into Tier A / Tier B segments (drops anything <70).

Adapts the AI Ark metadata column names to the scorer's expected canonical
column names. Mapping:
  company_headcount_start (+ _end) -> company_headcount (use start as the
                                       representative integer)
  person_country  -> company_location
  industry        -> company_industry (already canonical)
"""
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

def normalize_for_scoring(r: dict) -> dict:
    """Return a SHALLOW-copy of r with the canonical columns the scorer needs.
    Does NOT mutate r (we keep the rich metadata for downstream)."""
    n = dict(r)
    # Headcount: prefer explicit company_headcount, else use start of range
    if not n.get('company_headcount'):
        try:
            n['company_headcount'] = int(r.get('company_headcount_start') or 0)
        except (TypeError, ValueError):
            n['company_headcount'] = 0
    # Location: prefer explicit company_location, else person_country
    if not n.get('company_location'):
        n['company_location'] = r.get('person_country') or ''
    return n

def process(cfg: dict) -> None:
    with open(cfg['in'], newline='') as f:
        rows = list(csv.DictReader(f))
    print(f"\nScoring {len(rows)} rows from {cfg['in']}")

    a_rows, b_rows = [], []
    tier_counts = Counter()
    for r in rows:
        normalized = normalize_for_scoring(r)
        s = score_lead(normalized, cfg['icp'])
        t = tier_for_score(s)
        # Annotate the ORIGINAL row (preserving rich metadata) with score + tier
        r['icp_score'] = str(s)
        r['icp_tier']  = t or 'DROP'
        tier_counts[r['icp_tier']] += 1
        if t == 'A':
            a_rows.append(r)
        elif t == 'B':
            b_rows.append(r)

    print(f'  Tier A: {tier_counts["A"]}  Tier B: {tier_counts["B"]}  Drop: {tier_counts["DROP"]}')
    print(f'  Credit cost forecast: ~{tier_counts["A"] + tier_counts["B"]} credits '
          f'(1 per landed verified email, less BounceBan miss rate ~10-20%)')

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

Expected: each niche prints Tier A / B / Drop counts AND a credit forecast. Combined credit forecast across both niches should be ≤ remaining credit balance (~5,099 minus a small buffer for misses). If the forecast EXCEEDS the balance, tighten ICP filters in Tasks 5-6 and re-run; do NOT proceed to Task 10.

- [ ] **Step 3: Sanity-check the splits**

```bash
wc -l data/niche-2026/scored-*.csv
```

If Tier A is <5% or >40%, the scoring matrix or signal-enrichment hit rate is off — revisit Task 7 thresholds.

- [ ] **Step 4: Commit**

```bash
git add scripts/campaigns/score-and-tier-niche-2026.py
git commit -m "feat(campaigns): score + tier-split niche-2026 leads

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: AI Ark export → poll → dedupe (THE credit-spending task)

**Files:**
- Create: `scripts/campaigns/aiark-export-and-poll-niche-2026.py`

This is the only step in the entire plan that spends AI Ark credits. Submits 4 export jobs (one per scored tier CSV), polls each to `state=DONE`, fetches the verified-email inquiries pages, joins back to the original tier metadata by `aiark_person_id`, dedupes against the existing 18K universe in `/segmented-lists/`, and writes the 4 final CSVs.

**Pre-flight credit gate:** the script refuses to start if forecasted spend (Task 9 output) exceeds remaining credits.

**No MillionVerifier:** AI Ark already verifies via BounceBan. Re-running another verifier would be redundant spend.

- [ ] **Step 1: Write the orchestrator**

Create `scripts/campaigns/aiark-export-and-poll-niche-2026.py`:

```python
#!/usr/bin/env python3
"""Stage 4: spend AI Ark credits to fetch BounceBan-verified emails ONLY for
Tier A + B survivors. Polls /people/export/{trackId}/statistics until DONE,
then pages /people/export/{trackId}/inquiries for results. Joins back to the
scored metadata by aiark_person_id. Dedupes vs the existing 18K-lead universe
in /segmented-lists/. Writes final CSVs to /segmented-lists/.
"""
import csv
import glob
import json
import os
import subprocess
import sys
import time
from typing import Dict, Set

ROOT = os.path.expanduser('~/Documents/coldcrafthq')
SEG_DIR = f'{ROOT}/segmented-lists'
DUMMY_WEBHOOK = 'https://webhook.coldcrafthq.com/aiark-noop'  # we poll instead

JOBS = [
    {
        'scored_csv': f'{ROOT}/data/niche-2026/scored-recruiters-A.csv',
        'export_csv': f'{ROOT}/data/niche-2026/exported-recruiters-A.csv',
        'final_csv':  f'{SEG_DIR}/CC-List-RetainedRecruiters-A.csv',
        'job_label':  'recruiters-A',
    },
    {
        'scored_csv': f'{ROOT}/data/niche-2026/scored-recruiters-B.csv',
        'export_csv': f'{ROOT}/data/niche-2026/exported-recruiters-B.csv',
        'final_csv':  f'{SEG_DIR}/CC-List-RetainedRecruiters-B.csv',
        'job_label':  'recruiters-B',
    },
    {
        'scored_csv': f'{ROOT}/data/niche-2026/scored-agencies-A.csv',
        'export_csv': f'{ROOT}/data/niche-2026/exported-agencies-A.csv',
        'final_csv':  f'{SEG_DIR}/CC-List-SpecialistAgencies-A.csv',
        'job_label':  'agencies-A',
    },
    {
        'scored_csv': f'{ROOT}/data/niche-2026/scored-agencies-B.csv',
        'export_csv': f'{ROOT}/data/niche-2026/exported-agencies-B.csv',
        'final_csv':  f'{SEG_DIR}/CC-List-SpecialistAgencies-B.csv',
        'job_label':  'agencies-B',
    },
]

def load_env() -> dict:
    env = os.environ.copy()
    with open(f'{ROOT}/.env.prod') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k] = v.strip('"').strip("'")
    return env

def cli(env: dict, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(['npx', 'tsx', 'scripts/campaigns/ai-ark-cli.ts', *args],
                          env=env, capture_output=True, text=True, check=True)

def get_credits(env: dict) -> float:
    r = cli(env, 'credits')
    return float(json.loads(r.stdout.strip())['total'])

def forecast_total(jobs) -> int:
    """Sum of scored rows across all jobs = upper-bound credit spend."""
    n = 0
    for j in jobs:
        if not os.path.exists(j['scored_csv']):
            continue
        with open(j['scored_csv'], newline='') as f:
            n += sum(1 for _ in csv.DictReader(f))
    return n

def build_export_params(scored_csv: str) -> dict:
    """Build a /people/export body that targets the EXACT aiark_person_ids
    in the scored CSV. Per AI Ark docs the `account` filter is required, but
    we can target a list of person ids via lists.people_id.include if the
    API supports it; otherwise we re-run the original niche filter and
    intersect post-fetch. CONFIRM via the api-notes file at runtime.
    """
    # The most robust approach is to re-issue the original niche filters
    # plus a list-include of the specific aiark_person_ids. Read the first
    # scored row to determine which niche params to use.
    with open(scored_csv, newline='') as f:
        rows = list(csv.DictReader(f))
    if not rows:
        return {}
    person_ids = [r['aiark_person_id'] for r in rows if r.get('aiark_person_id')]
    # Pick params file by tier label embedded in the path
    if 'recruiters' in scored_csv:
        params_path = f'{ROOT}/data/niche-2026/params-retained-recruiters.json'
    else:
        params_path = f'{ROOT}/data/niche-2026/params-specialist-agencies.json'
    with open(params_path) as f:
        params = json.load(f)
    # Constrain to just our scored survivors:
    params.setdefault('lists', {})
    params['lists']['people_id'] = {'include': person_ids}
    params['size'] = min(len(person_ids), 10000)
    params['maxResults'] = len(person_ids)
    return params

def poll_until_done(env: dict, track_id: str, label: str, max_wait_s: int = 3600) -> dict:
    started = time.time()
    delay = 30
    while True:
        r = cli(env, 'poll-export', f'--track-id={track_id}')
        stats = json.loads(r.stdout.strip())
        state = stats.get('state', '')
        s = stats.get('statistics', {})
        print(f'  [{label}] state={state} found={s.get("found")}/{s.get("total")} '
              f'elapsed={int(time.time() - started)}s')
        if state == 'DONE':
            return stats
        if state == 'FAILED':
            raise RuntimeError(f'export job FAILED: {stats}')
        if time.time() - started > max_wait_s:
            raise TimeoutError(f'export job did not reach DONE within {max_wait_s}s')
        time.sleep(delay)
        delay = min(delay * 1.5, 120)  # back off to max 2 min

def existing_emails() -> Set[str]:
    seen: Set[str] = set()
    skip = {j['final_csv'] for j in JOBS}
    for path in glob.glob(f'{SEG_DIR}/CC-List-*.csv'):
        if path in skip:
            continue
        try:
            with open(path, newline='') as f:
                for r in csv.DictReader(f):
                    e = (r.get('email') or '').strip().lower()
                    if e:
                        seen.add(e)
        except Exception:
            continue
    print(f'Universe dedupe set: {len(seen)} existing emails across '
          f'{len(glob.glob(f"{SEG_DIR}/CC-List-*.csv")) - len(skip)} segmented lists')
    return seen

def join_and_dedupe(scored_csv: str, export_csv: str, final_csv: str, seen: Set[str]) -> None:
    """Left-join exported emails (refId is the aiark_person_id) onto scored rows,
    then dedupe against the existing universe + within-batch.
    """
    with open(scored_csv, newline='') as f:
        scored = {r['aiark_person_id']: r for r in csv.DictReader(f) if r.get('aiark_person_id')}
    with open(export_csv, newline='') as f:
        exports = list(csv.DictReader(f))

    final_rows = []
    skipped_no_match = 0
    skipped_no_email = 0
    skipped_dupe = 0
    for x in exports:
        # In the fetch-export CLI output, refId is the AI Ark person id
        pid = x.get('refId', '').strip()
        meta = scored.get(pid)
        if not meta:
            skipped_no_match += 1
            continue
        email = (x.get('email') or '').strip().lower()
        if not email:
            skipped_no_email += 1
            continue
        if email in seen:
            skipped_dupe += 1
            continue
        seen.add(email)
        merged = {**meta, **{k: v for k, v in x.items() if k in
                             ('email', 'email_status', 'email_substatus', 'email_domain_type')}}
        final_rows.append(merged)

    print(f'  match={len(final_rows)} no_meta={skipped_no_match} '
          f'no_email={skipped_no_email} dupes={skipped_dupe}')

    if not final_rows:
        print(f'  [warn] no rows survived for {final_csv}')
        return
    with open(final_csv, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(final_rows[0].keys()))
        w.writeheader()
        w.writerows(final_rows)
    print(f'  wrote {len(final_rows)} -> {final_csv}')

def main() -> int:
    os.chdir(ROOT)
    env = load_env()

    # Pre-flight: refuse if forecasted spend exceeds remaining credits.
    credits = get_credits(env)
    forecast = forecast_total(JOBS)
    print(f'\nCredit balance: {credits:.1f}')
    print(f'Forecasted upper-bound spend (Tier A+B rows): {forecast} credits')
    if forecast > credits:
        print(f'\nABORT: forecasted spend exceeds credit balance. '
              f'Tighten ICPs (Tasks 5-6) or top up credits before re-running.')
        return 2

    seen = existing_emails()

    # Submit all 4 export jobs first (parallel async), then poll each.
    track_ids: Dict[str, str] = {}
    for job in JOBS:
        if not os.path.exists(job['scored_csv']):
            print(f"[skip] {job['scored_csv']} missing")
            continue
        params = build_export_params(job['scored_csv'])
        if not params:
            print(f"[skip] {job['job_label']}: no rows to export")
            continue
        params_path = job['scored_csv'].replace('.csv', '.export-params.json')
        with open(params_path, 'w') as f:
            json.dump(params, f)
        r = cli(env, 'export-people', f'--params={params_path}', f'--webhook={DUMMY_WEBHOOK}')
        track_ids[job['job_label']] = r.stdout.strip()
        print(f"submitted {job['job_label']}: trackId={track_ids[job['job_label']]}")

    # Poll all to DONE
    for job in JOBS:
        tid = track_ids.get(job['job_label'])
        if not tid:
            continue
        print(f"\npolling {job['job_label']}...")
        poll_until_done(env, tid, job['job_label'])
        # Fetch results
        cli(env, 'fetch-export', f'--track-id={tid}', f'--out={job["export_csv"]}')

    # Join + dedupe + final-write
    for job in JOBS:
        if not os.path.exists(job['export_csv']):
            continue
        print(f"\njoining {job['job_label']}...")
        join_and_dedupe(job['scored_csv'], job['export_csv'], job['final_csv'], seen)

    final_credits = get_credits(env)
    print(f'\nCredit balance after run: {final_credits:.1f} '
          f'(spent {credits - final_credits:.1f})')
    return 0

if __name__ == '__main__':
    sys.exit(main())
```

> **CONFIRM at runtime**: the `lists.people_id.include` filter on `/people/export` works as expected. Task 1's notes documented `exclude` semantics; `include` is plausible but not directly probed. If `include` is unsupported, the fallback is to re-issue the original `/people/export` with niche params and accept that we'll get a superset of survivors (still bounded by credit balance via `size`). Reject duplicates post-fetch.

- [ ] **Step 2: Run it**

```bash
cd /Users/matt/Documents/coldcrafthq
python3 scripts/campaigns/aiark-export-and-poll-niche-2026.py
```

Expected:
- Pre-flight prints credit balance + forecasted spend; aborts if forecast > balance
- Submits 4 export jobs, prints 4 trackIds
- Polls each every 30-120s with progress lines
- Joins back to metadata; prints per-job match/no_email/dupe counts
- Writes 4 CSVs to `/segmented-lists/`
- Reports final credit balance

Expected runtime: 30 min - 2 hours depending on cohort size and AI Ark queue. Per-niche, expect Tier-A to retain ~80% (smaller cohort, higher-quality LinkedIn presence → better BounceBan hit rate), Tier-B ~65-75%.

- [ ] **Step 3: Verify final counts**

```bash
wc -l segmented-lists/CC-List-RetainedRecruiters-A.csv \
      segmented-lists/CC-List-RetainedRecruiters-B.csv \
      segmented-lists/CC-List-SpecialistAgencies-A.csv \
      segmented-lists/CC-List-SpecialistAgencies-B.csv
```

At the 5K credit ceiling and the spec's expected tier distribution, target final counts:
- A-tiers: ~300-600 each
- B-tiers: ~1,000-1,800 each

Total: ~3,000-4,500 verified leads across both niches.

- [ ] **Step 4: Commit**

```bash
git add scripts/campaigns/aiark-export-and-poll-niche-2026.py \
        segmented-lists/CC-List-RetainedRecruiters-A.csv \
        segmented-lists/CC-List-RetainedRecruiters-B.csv \
        segmented-lists/CC-List-SpecialistAgencies-A.csv \
        segmented-lists/CC-List-SpecialistAgencies-B.csv
git commit -m "feat(campaigns): AI Ark export + poll + dedupe niche-2026 final lists

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
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
