# AI Ark API — Discovery Notes

Task 1 of the new-niche list-build plan (`/docs/superpowers/plans/2026-05-26-new-niche-list-build.md`).
Probed live against the AI Ark contact-data API on 2026-05-26 with the provided API key. All paths, headers, and field names below are verified by real HTTP responses, not guessed from docs alone.

Docs root: `https://docs.ai-ark.com/` (also `https://docs.ai-ark.com/llms.txt` for the machine-readable index).

> The vendor's marketing site is **`ai-ark.com`** (not `aiark.io`, which is an unrelated Korean dental brand, and not `aiark.com`, which is a different parked site). The API host is `api.ai-ark.com`.

---

## 1. Base URL

```
https://api.ai-ark.com/api/developer-portal/v1
```

All endpoints below are appended to this base.
Note: the docs' "API Reference" pages render paths as `/v1/...`; the real external URL is `/api/developer-portal/v1/...`. (You can see this in error bodies — the server logs the internal route as `/v1/people/export` but the request goes to the full developer-portal path.)

## 2. Auth scheme

Header `X-TOKEN`, raw API key, no prefix.

```
X-TOKEN: <API_KEY>
```

Other schemes tested and rejected (`401 No API key found`):
- `Authorization: Bearer <key>` — rejected
- `x-api-key: <key>` — rejected
- `X-API-TOKEN: <key>` — rejected

Working curl shape:

```bash
curl -X POST https://api.ai-ark.com/api/developer-portal/v1/companies \
  -H "X-TOKEN: <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"page":0,"size":1}'
```

The `docs/first-steps` page mentions "Bearer" — **that doc page is wrong**. The actual auth, confirmed against `/companies`, `/people`, `/payments/credits`, `/people/email-finder`, and `/people/export`, is `X-TOKEN` with a raw key.

## 3. Company search

```
POST /api/developer-portal/v1/companies
Content-Type: application/json
X-TOKEN: <API_KEY>
```

Request body (all filters optional; combine with `account` + paginate with `page`/`size`):

```json
{
  "page": 0,
  "size": 25,
  "account": {
    "industry": ["staffing and recruiting"],
    "employeeSize": { "type": "RANGE", "range": [{ "start": 11, "end": 200 }] },
    "location": { "country": ["United States", "Canada"] }
  },
  "lists": { "company_id": { "exclude": ["<list-id>"] } },
  "lookalikeDomains": []
}
```

Probed response (top-level shape) — Tata Group used as `size:1` test record:

```json
{
  "content": [
    {
      "id": "7e04e66b-20de-4801-840e-12d513d59585",
      "summary": {
        "name": "Tata Group",
        "description": "...",
        "founded_year": 1868,
        "type": "PRIVATELY_HELD",
        "industry": "executive offices",
        "staff": { "total": 1007953, "range": { "start": 10001 } },
        "logo": { "source": "https://images.ai-ark.com/..." }
      },
      "link": {
        "website": "http://www.tata.com",
        "domain": "tata.com",
        "domain_ltd": "tata.com",
        "linkedin": "https://www.linkedin.com/company/tata-group"
      },
      "contact": { "phone": { "raw": "+912266658282", "sanitized": "+912266658282" } },
      "financial": { "revenue": { "annual": { "start": 10000000000, "end": 9223372036854775807 } } },
      "location": {
        "headquarter": {
          "continent": "Asia", "country": "India", "state": "Maharashtra",
          "city": "Mumbai", "street": "Bombay House, 24 Homi Mody Street",
          "postal_code": "400001",
          "position": { "lng": 72.87369, "lat": 19.146397 }
        },
        "locations": [ /* same shape, array */ ]
      },
      "technologies": [{ "name": "Adobe CQ", "category": "CMS" }],
      "industries": ["executive offices"],
      "keywords": ["information technology", "..."],
      "hashtags": ["tatagroup"],
      "languages": ["english", "hindi"],
      "naics": ["561499", "541613", "541512"],
      "last_updated": "2026-05-07"
    }
  ],
  "pageable": { "pageNumber": 0, "pageSize": 1, "sort": {"sorted":true}, "offset": 0 },
  "totalPages": 70841359,
  "totalElements": 70841359,
  "last": false,
  "size": 1,
  "number": 0,
  "numberOfElements": 1,
  "first": true,
  "empty": false
}
```

Key company fields → ColdCraft fields:
- `summary.name` → `company_name`
- `summary.industry` (string) and `industries[]` (array) → `company_industry`
- `summary.staff.total` and `summary.staff.range.{start,end}` → `company_headcount`
- `link.domain` (or `link.domain_ltd`) → `company_domain`
- `link.linkedin` → `company_linkedin_url`
- `location.headquarter.{country,state,city}` → `company_location`
- `id` → AI-Ark internal company id (UUID; use this for `account` joins or list exclusion)

## 4. People search (no email)

```
POST /api/developer-portal/v1/people
Content-Type: application/json
X-TOKEN: <API_KEY>
```

**Critical:** This endpoint returns rich profile metadata but **NO email field**. Emails require a separate call to the email-finder pipeline (Section 6).

Filter shape (mirrors `/companies` for `account`, adds `contact` for person attributes):

```json
{
  "page": 0,
  "size": 25,
  "account": {
    "industry": ["staffing and recruiting"],
    "employeeSize": { "type": "RANGE", "range": [{ "start": 11, "end": 200 }] },
    "location": { "country": ["United States", "Canada"] }
  },
  "contact": {
    "current_position": { "titles": ["CEO", "Managing Partner", "Founder"] }
  },
  "lists": { "people_id": { "exclude": ["<list-id>"] } }
}
```

Real probed response (one record, sanitized — emails redacted per task rules; this record happened not to include one anyway since people-search returns no email):

```json
{
  "content": [
    {
      "id": "00000123-c2fb-6d05-e5fc-a270045ca7d0",
      "identifier": "mohith-basavaraju-206443206",
      "profile": {
        "first_name": "Mohith",
        "last_name": "Basavaraju",
        "full_name": "Mohith Basavaraju",
        "headline": "Business Analytics||...",
        "title": "Assistant Manager- Risk analytics and forensics",
        "picture": { "source": "https://images.ai-ark.com/..." },
        "background": null,
        "birth_date": "1600-12-06",
        "summary": "..."
      },
      "link": {
        "linkedin": "https://www.linkedin.com/in/mohith-basavaraju-206443206",
        "twitter": null, "github": null, "facebook": null
      },
      "location": {
        "default": "Bengaluru, Karnataka, India, Asia",
        "short": "Bengaluru, Karnataka",
        "country": "India", "state": "Karnataka", "city": "Bengaluru",
        "position": null
      },
      "languages": { "primary_locale": { "country": "US", "language": "en" } },
      "industry": "Information Technology & Services",
      "educations": [{ "school": { "name": "Dr. Ambedkar Institute Of Technology" }, "degree_name": "Bachelor's degree", "field_of_study": "Mechanical Engineering" }],
      "position_groups": [
        {
          "company": {
            "id": "0903063a-6018-7239-2742-e6b77a82c9a9",
            "name": "PwC India",
            "logo": "...",
            "url": "https://www.linkedin.com/company/pwc-india",
            "employees": { "start": 10001, "end": null }
          },
          "date": { "start": "2023-06-01", "end": null },
          "profile_positions": [
            {
              "company": "PwC India",
              "title": "Assistant Manager- Risk analytics and forensics",
              "employment_type": "Full-time",
              "location": "Bengaluru, Karnataka, India",
              "date": { "start": "2023-06-01", "end": null }
            }
          ]
        }
      ],
      "skills": ["..."],
      "department": {
        "departments": ["master_information_technology","master_finance","master_legal"],
        "sub_departments": ["compliance","data_science","financial_risk","..."],
        "functions": ["information_technology","operations","data_science","finance","legal"],
        "seniority": "senior"
      },
      "last_updated": "2026-05-07"
    }
  ],
  "size": 1,
  "totalElements": 411807903,
  "pageable": { "pageNumber": 0, "pageSize": 1, "offset": 0 },
  "trackId": "861f6950-692f-4524-aa2b-ede803109a79",
  "last": false, "totalPages": 411807903, "numberOfElements": 1, "first": true, "empty": false,
  "number": 0
}
```

Critical: **`trackId` at the top level of the response** is what you pass to the Email Finder endpoint to enrich the just-searched cohort with emails. Each `trackId` is **single-use** and **expires in 6 hours**.

Key person fields → ColdCraft fields:
- `profile.first_name` → `first_name`
- `profile.last_name` → `last_name`
- `profile.title` → `title` (also `position_groups[0].profile_positions[0].title` for current role)
- `position_groups[0].company.name` → `company_name`
- `position_groups[0].company.id` → AI-Ark company UUID (for joining to `/companies`)
- `position_groups[0].company.url` → `company_linkedin_url`
- `position_groups[0].company.employees.{start,end}` → `company_headcount`
- `link.linkedin` → `linkedin_url`
- `location.{country,state,city}` → person location
- `industry` (string) → `company_industry` (rolled up from current company)
- `id` → AI-Ark person UUID (use for `/people/export/single` lookup)
- **email/`company_domain` are NOT in this response — both come from the email-finder pipeline below**

## 5. Pagination

`page` and `size` query/body params, on both `/companies` and `/people`:
- `page`: 0-based integer
- `size`: 0–100 range for regular search (default 10)
- For `/people/export` (with email): `size` max is **10000** (one export job is up to 10k results)
- `totalElements` / `totalPages` in the response body
- Convention is Spring-Boot `Pageable` (also exposes `last`, `first`, `numberOfElements`, `empty`)

## 6. Email enrichment workflow (THE LOAD-BEARING PART)

There are three ways to attach emails to people records. All run through BounceBan real-time verification (you cannot opt out).

### 6a. Single-person email enrichment (real-time, synchronous)
```
POST /api/developer-portal/v1/people/export/single
```
Body: `{ "id": "<ai-ark-person-uuid>" }` OR `{ "url": "<linkedin-url>" }`.
Returns full profile + `email.output[].address` when found.
Returns `404` when no email found.
**Cost: 1 credit per success (0.5 enrichment + 0.5 verification). 0 credits per failure.**

### 6b. Bulk email enrichment from a People Search trackId (async, webhook)
```
POST /api/developer-portal/v1/people/email-finder
```
Body:
```json
{ "trackId": "<from /people response>", "webhook": "https://your-receiver.example.com/aiark" }
```
- `trackId` is consumed on first use and expires 6 hours after the search.
- `webhook` is **required** (verified by 400 response: `webhook is required`).
- Returns immediately with `{trackId, statistics:{total,found}, webhook:{state:"PENDING"}, state:"PENDING"}`.
- Poll progress at `GET /api/developer-portal/v1/people/email-finder/{trackId}/statistics`.
- Fetch results at `GET /api/developer-portal/v1/people/email-finder/{trackId}/inquiries?page=0&size=100`.

Results page shape:
```json
{
  "content": [
    {
      "refId": "ee0bf902-00c7-deff-1fda-45bedef39602",
      "state": "DONE",
      "input": { "firstname": "Christopher", "lastname": "Sparks", "domain": "themetalmaniacs.com" },
      "output": [
        {
          "address": "redacted@example.com",
          "status": "VALID",
          "subStatus": "EMPTY",
          "domainType": "SMTP",
          "date": "2026-03-13T09:28:35.000779"
        }
      ]
    }
  ],
  "trackId": "719aba5a-876f-4690-bb57-5157153836b4",
  "totalElements": 100,
  "totalPages": 10
}
```

### 6c. Search-with-export (one shot, runs the same search and email-finds in one job)
```
POST /api/developer-portal/v1/people/export
```
Same body as `/people` (account + contact filters) PLUS `webhook` (required), with `size` up to 10000. Returns `{trackId, state:"PENDING"}`. Poll/fetch via the corresponding `/people/export/{trackId}/inquiries` and `/people/export/{trackId}/statistics` endpoints.

The export endpoint emits items that look like the People Search items but with an `email` object attached:
```json
"email": {
  "state": "DONE",
  "output": [
    {
      "address": "redacted@example.com",
      "status": "VALID",
      "subStatus": "EMPTY",
      "domainType": "SMTP",
      "mx": { "record": "...", "google": false, "found": true, "provider": "..." },
      "date": "2026-03-13T09:28:35.000779",
      "free": true, "generic": false, "found": true
    }
  ]
}
```

## 7. Account / credit endpoint (the "/me"-like check)

```
GET /api/developer-portal/v1/payments/credits
Content-Type: application/json
X-TOKEN: <API_KEY>
```

Response (live, today):
```json
{ "total": 5099.4 }
```

There is **no richer plan-info endpoint** exposed by the developer-portal API. `/me`, `/account`, `/payments`, `/payments/quotas`, `/payments/credits/usage` all return `401`. The credit balance is your only programmatic plan signal.

**On the "10K plan cap":** the credit balance is currently **5099.4**, not 10000. That suggests one of: (a) the 10K plan was for a different unit (records, not credits — unlikely, since the docs and the `x-credit` header both meter in fractional credits); (b) some credits were spent before this key was handed off; (c) the plan cap is higher than 10K and 10K was an estimate. Either way, **the live balance is 5099.4 credits as of 2026-05-26**. At 1 credit per found-email export, that's ~5099 emails — about half of the plan's nominal lead budget. **Action item:** confirm with the user / vendor portal whether 10K is the correct ceiling before Tasks 4–6 burn through this.

## 8. Rate limits

Per `X-TOKEN` (i.e. per API key), from response headers on every call:

| Header | Observed value |
|---|---|
| `ratelimit-limit` | `5` |
| `ratelimit-remaining` | counts down per second |
| `ratelimit-reset` | `1` (seconds until reset) |
| `x-ratelimit-limit-second` | `5` |
| `x-ratelimit-remaining-second` | counts down per second |
| `x-credit` | per-call credit delta (e.g. `-0.5`) |

Docs additionally state:
- 5 req/s, 300 req/min, 18,000 req/hour (per endpoint family)
- With `size=100` on bulk endpoints: 500 records/s, 30,000/min, 1.8M/hour
- Rate limits reset every 60s
- No documented daily cap

## 9. Verification toggle — IMPORTANT MISMATCH WITH PLAN ASSUMPTIONS

> The plan asks: "is there a `verify_emails: false` (or similar) parameter on the search endpoint that controls whether AI Ark consumes its own verification budget? CRITICAL: confirm we can pull RAW unverified leads to preserve quota."

**Answer: NO.** There is no `verify_emails` flag. AI Ark's architecture is different from Apollo/Lusha:

- `/people` (People Search) is metadata-only: profile + company + LinkedIn. **Zero email returned, no verification billed.** This is effectively "raw, unverified" — but it's also "no email at all".
- To get an email you MUST call `/people/email-finder`, `/people/export`, or `/people/export/single`. **Every email returned is BounceBan-verified in real time**, and **1 credit is charged per successful find** (0.5 enrich + 0.5 verify). Failed finds cost 0.
- There is no "give me the email without verifying it" mode. This is repeatedly stressed across `find-emails-by-track-id`, `export-with-email`, `export-single`, and `email-finder-results` doc pages: "All emails (SMTP & CATCH_ALL) returned by the API are verified in real time by BounceBan."

**Implication for our Reacher VPS verifier:**
- We can't dodge AI Ark's verification step to save credits. Every email we get is already SMTP/catch-all verified by BounceBan.
- We still want Reacher in the pipeline for: (a) sanity-rechecking catch-all results (BounceBan marks catch-alls explicitly via `domainType: "CATCH_ALL"`), (b) periodic re-verification before sending, (c) keeping consistency with the rest of our lead-source verification flow.
- **Cost model the plan should use:** ~1 credit per landed verified email (worst case), with a free pass on unfindable contacts. At 5099 credits, expect a worst-case 5099 verified leads. If the 10K plan cap is the actual ceiling we'll get back to, it's 10K verified leads.
- We can use `/people` (no email) to "preview" a search before committing to `/people/export` — same filters, zero email-finder spend. This is the closest analog to a "dry-run" check the plan calls for.

## 10. Other useful endpoints discovered

- `POST /api/developer-portal/v1/people/mobile-phone-finder` — phone enrichment (separate cost line)
- `POST /api/developer-portal/v1/people/reverse-lookup` — email/phone → person lookup
- `POST /api/developer-portal/v1/people/analysis` — personality analysis from LinkedIn URL
- `POST /api/developer-portal/v1/lists` — create/update exclusion lists (max 50 lists/day, 10K items each, 24h expiry); supports `people_id` and `company_id` types with `APPEND` (default) / `REPLACE` modes
- `POST /api/developer-portal/v1/people/email-finder/{trackId}/resend-webhook` — resend webhook
- `POST /api/developer-portal/v1/people/export/{trackId}/resend-webhook` — resend webhook
- MCP server: `https://docs.ai-ark.com/docs/mcp` — there's a Model Context Protocol server option if we want first-class Claude integration later

## 11. Summary verdict for Task 2

- Base URL constant: `https://api.ai-ark.com/api/developer-portal/v1`
- Auth header: `X-TOKEN: <key>` (raw, no Bearer prefix)
- Three primitives the TS client needs: `searchCompanies`, `searchPeople`, `exportPeopleWithEmail` (+ matching pollers for statistics and inquiries)
- All POSTs require `Content-Type: application/json`
- All email-bearing operations require a publicly-reachable `webhook` URL OR we can also poll the `/inquiries` endpoint
- The plan's "verify=false" toggle assumption is wrong — drop that from the Task 2 client design. The right preservation strategy is `/people` for filter-tuning iteration (cheap), then a single `/people/export` per finalized cohort (1 credit per landed email, free on misses).

---

_Probed by Claude on 2026-05-26 against live `api.ai-ark.com` with the assigned API key. No real lead emails were committed to this file — all `output[].address` examples replaced with `redacted@example.com`. The probed live record (Mohith Basavaraju) was a public LinkedIn profile returned by `/people` and contained no email; it is included as the verbatim response shape, not as a lead._
