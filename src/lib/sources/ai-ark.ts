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

// Per-token rate limit is 5 req/s (verified via response headers in Task 4).
// Sleep ~220ms between sequential paginated requests to stay safely under
// the limit (5 req/s = 200ms; +10% safety margin).
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const INTER_PAGE_DELAY_MS = 220;

// AI Ark's edge has been observed to drop the TCP connection mid-stream
// (ECONNRESET surfaces as undici's TypeError("terminated")). Network errors,
// timeouts, and 5xx server errors are all worth one retry with backoff —
// these are transient and the records aren't paid for unless the call
// completes successfully. The retries are sequential and respect the rate
// limit via the inter-page throttle.
const RETRY_BACKOFFS_MS = [500, 1500, 4000];

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // Node's outer `fetch failed` error wraps the real cause; inspect both.
  // ES2022 Error.cause is widely available at runtime in Node 18+; the
  // `as { cause?: unknown }` cast keeps stricter TS targets happy.
  const errWithCause = err as Error & { cause?: unknown };
  const cause = errWithCause.cause;
  const msg = err.message || '';
  const causeMsg = cause instanceof Error ? cause.message : '';
  const causeCode = cause instanceof Error
    ? ((cause as NodeJS.ErrnoException).code ?? '')
    : '';
  const combined = `${msg} ${causeMsg} ${causeCode}`;

  if (err.name === 'AbortError') return true;
  if (combined.includes('terminated')) return true;        // undici body-stream abort
  if (combined.includes('fetch failed')) return true;      // Node generic wrapper
  if (combined.includes('ECONNRESET')) return true;
  if (combined.includes('ETIMEDOUT')) return true;
  if (combined.includes('ENOTFOUND')) return true;
  if (combined.includes('EAI_AGAIN')) return true;
  if (combined.includes('socket hang up')) return true;
  if (combined.includes('EPIPE')) return true;
  if (/AI Ark .* failed: 5\d\d /.test(msg)) return true;  // 5xx server error
  if (/AI Ark .* failed: 429 /.test(msg)) return true;    // rate-limit
  return false;
}

// Wraps any async operation (fetch + body-parse) with transient-error retry.
// Body-stream errors from undici (e.g. "terminated" / ECONNRESET during
// res.json()) surface AFTER fetch returns, so the entire fetch+parse
// pipeline must live inside this wrapper — not just the initial fetch call.
async function withRetry<T>(op: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_BACKOFFS_MS.length; attempt++) {
    try {
      return await op();
    } catch (err) {
      lastErr = err;
      if (!isTransientError(err) || attempt === RETRY_BACKOFFS_MS.length) {
        throw err;
      }
      const wait = RETRY_BACKOFFS_MS[attempt];
      // eslint-disable-next-line no-console
      console.error(`[ai-ark] ${label} attempt ${attempt + 1} failed (${(err as Error).message}); retrying in ${wait}ms`);
      await sleep(wait);
    }
  }
  throw lastErr;
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
  page?: number;       // starting page (zero-based). Use for resume; default 0.
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
  return withRetry(async () => {
    const res = await fetch(`${API_BASE}/payments/credits`, {
      method: 'GET',
      headers: headers(),
      signal: AbortSignal.timeout(15_000),
    });
    return jsonOrThrow<AIArkCredits>(res, 'getCredits');
  }, 'getCredits');
}

// Per-page callback type — fires after each successful page fetch so the
// caller can persist immediately (CRITICAL for credit preservation: AI Ark
// charges 0.5 credits per RECORD, and a mid-pagination ECONNRESET would
// otherwise lose all in-memory pages already paid for).
export type AIArkPageCallback = (batch: AIArkPersonRecord[], pageNum: number) => void | Promise<void>;

export async function searchPeople(
  params: AIArkPeopleSearchParams,
  onPage?: AIArkPageCallback,
): Promise<AIArkPeopleSearchResult> {
  const pageSize = Math.min(params.size ?? MAX_PAGE_SIZE_SEARCH, MAX_PAGE_SIZE_SEARCH);
  const maxResults = params.maxResults ?? 5_000;

  const records: AIArkPersonRecord[] = [];
  let page = params.page ?? 0;
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
    const data = await withRetry(async () => {
      const res = await fetch(`${API_BASE}/people`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      return jsonOrThrow<{
        content?: AIArkPersonRecord[];
        totalElements?: number;
        totalPages?: number;
        last?: boolean;
        number?: number;
        trackId?: string;
      }>(res, 'searchPeople');
    }, `searchPeople page=${page}`);

    const batch = data.content ?? [];
    records.push(...batch);
    totalElements = data.totalElements ?? totalElements;
    trackId = data.trackId ?? trackId;
    last = !!data.last || batch.length === 0;

    // Per-page callback — let the caller persist this page BEFORE we advance.
    // Failures in the callback bubble up so the caller can decide whether to
    // continue or abort (since the page is already paid for, partial persistence
    // is always better than throwing without writing).
    if (batch.length > 0 && onPage) await onPage(batch, page);

    page += 1;

    if (batch.length === 0) break;
    if (!last && records.length < maxResults) await sleep(INTER_PAGE_DELAY_MS);
  }

  return { records: records.slice(0, maxResults), totalElements, trackId };
}

export interface AIArkExportParams extends AIArkPeopleSearchParams {
  // /people/export size cap is 10_000 in one job
  size?: number;
}

// Response from POST /people/export/single — full profile + email output.
// 404 with no email found means no charge; success means 1 credit per match.
export interface AIArkSingleExportResult {
  found: boolean;          // false if HTTP 404 (no email)
  email?: string;
  emailStatus?: string;    // 'VALID' | 'INVALID' | 'UNKNOWN'
  emailSubStatus?: string;
  emailDomainType?: string; // 'SMTP' | 'CATCH_ALL'
  raw?: Record<string, unknown>; // full response body when found
}

// Synchronous single-person email export by AI Ark person id (or LinkedIn URL).
// Cost: 1 credit per success (0.5 enrich + 0.5 BounceBan verify), 0 per miss.
// 404 means no email found — treat as a miss (return { found: false }).
export async function exportPersonSingle(idOrUrl: { id?: string; url?: string }): Promise<AIArkSingleExportResult> {
  if (!idOrUrl.id && !idOrUrl.url) {
    throw new Error('exportPersonSingle requires id or url');
  }
  const body = idOrUrl.id ? { id: idOrUrl.id } : { url: idOrUrl.url };

  return withRetry(async () => {
    const res = await fetch(`${API_BASE}/people/export/single`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      // /people/export/single can take 30-60s per call (BounceBan SMTP probe
      // can be slow on misconfigured MX servers). 60s timeout matches AI Ark's
      // own typical p99 for this endpoint.
      signal: AbortSignal.timeout(60_000),
    });

    if (res.status === 404) {
      // Documented: no email found. Not an error, not charged.
      return { found: false };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AI Ark exportPersonSingle failed: ${res.status} ${text}`);
    }

    const data = await res.json() as Record<string, unknown>;
    // Email shape mirrors /people/export inquiries: `email.output[].address` w/ status fields
    const emailObj = data.email as { output?: Array<{
      address?: string; status?: string; subStatus?: string; domainType?: string;
    }> } | undefined;
    const firstValid = emailObj?.output?.find(o => o.status === 'VALID');
    if (!firstValid?.address) {
      return { found: false, raw: data };
    }
    return {
      found: true,
      email: firstValid.address,
      emailStatus: firstValid.status,
      emailSubStatus: firstValid.subStatus,
      emailDomainType: firstValid.domainType,
      raw: data,
    };
  }, `exportPersonSingle(${idOrUrl.id ?? idOrUrl.url})`);
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
  const data = await withRetry(async () => {
    const res = await fetch(`${API_BASE}/people/export`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    return jsonOrThrow<{ trackId: string; state?: string }>(res, 'exportPeopleWithEmail');
  }, 'exportPeopleWithEmail');
  if (!data.trackId) throw new Error('AI Ark export did not return a trackId');
  return data.trackId;
}

export async function getExportStatistics(trackId: string): Promise<AIArkExportStatistics> {
  return withRetry(async () => {
    const res = await fetch(
      `${API_BASE}/people/export/${encodeURIComponent(trackId)}/statistics`,
      { method: 'GET', headers: headers(), signal: AbortSignal.timeout(15_000) },
    );
    return jsonOrThrow<AIArkExportStatistics>(res, 'getExportStatistics');
  }, `getExportStatistics(${trackId})`);
}

export async function getExportInquiries(
  trackId: string,
  page = 0,
  size = 100,
): Promise<AIArkExportInquiriesPage> {
  return withRetry(async () => {
    const res = await fetch(
      `${API_BASE}/people/export/${encodeURIComponent(trackId)}/inquiries?page=${page}&size=${size}`,
      { method: 'GET', headers: headers(), signal: AbortSignal.timeout(30_000) },
    );
    return jsonOrThrow<AIArkExportInquiriesPage>(res, 'getExportInquiries');
  }, `getExportInquiries(${trackId},page=${page})`);
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
    const data = await withRetry(async () => {
      const res = await fetch(`${API_BASE}/companies`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      return jsonOrThrow<{
        content?: Array<Record<string, unknown>>;
        totalElements?: number;
        last?: boolean;
      }>(res, 'searchCompanies');
    }, `searchCompanies page=${page}`);
    const batch = data.content ?? [];
    records.push(...batch);
    totalElements = data.totalElements ?? totalElements;
    last = !!data.last || batch.length === 0;
    page += 1;
    if (batch.length === 0) break;
    if (!last && records.length < maxResults) await sleep(INTER_PAGE_DELAY_MS);
  }

  return { records: records.slice(0, maxResults), totalElements };
}
