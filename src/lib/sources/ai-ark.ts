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
