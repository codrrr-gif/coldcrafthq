#!/usr/bin/env python3
"""Tasks 12 + 13: Create 4 niche-2026 Instantly campaigns + attach sequences
+ sending accounts + import leads from the final segmented CSVs.

Mirrors the all-in-one pattern from setup-plan-campaigns.py.

Schedule + send rules (V9 lockdown):
  - Mon-Fri, 07:00-10:30 ET
  - 30/day per inbox
  - stop_on_reply: True, stop_on_auto_reply: True
  - text_only: True
  - link_tracking: False
  - open_tracking: False (per V9)

After running, all 4 campaigns are PAUSED. Manual QA + unpause is Task 14.
"""
import csv
import json
import os
import re
import subprocess
import time

ROOT = os.path.expanduser('~/Documents/coldcrafthq')
LISTS_DIR = f'{ROOT}/segmented-lists'

# Load API key from .env.prod
API_KEY = ''
with open(f'{ROOT}/.env.prod') as f:
    for line in f:
        if line.startswith('INSTANTLY_API_KEY='):
            API_KEY = line.strip().split('=', 1)[1].strip('"').strip("'")
            break
assert API_KEY, 'INSTANTLY_API_KEY not found in .env.prod'

# ── Sending pool (mirrors existing-campaign pattern) ───────────────────
# All 50 warm inboxes attached to every campaign. Instantly load-balances
# within each inbox's 30/day cap across all attached campaigns.
ALL_INBOXES = [
    'matt.m@coldcrafthqapp.com', 'matt.m@coldcrafthqco.com',
    'matt.m@coldcrafthqgroup.com', 'matt.m@coldcrafthqhub.com',
    'matt.m@coldcrafthqio.com', 'matt.m@coldcrafthqlabs.com',
    'matt.m@coldcrafthqnow.com', 'matt.m@coldcrafthqteam.com',
    'matt.m@getcoldcrafthq.com', 'matt.m@gocoldcrafthq.com',
    'matt.m@hellocoldcrafthq.com', 'matt.m@hicoldcrafthq.com',
    'matt.m@mycoldcrafthq.com', 'matt.m@thecoldcrafthq.com',
    'matt.m@trycoldcrafthq.com', 'matt.m@usecoldcrafthq.com',
    'matt.m@withcoldcrafthq.com',
    'matt@coldcrafthqapp.com', 'matt@coldcrafthqco.com',
    'matt@coldcrafthqgroup.com', 'matt@coldcrafthqhub.com',
    'matt@coldcrafthqio.com', 'matt@coldcrafthqlabs.com',
    'matt@coldcrafthqnow.com', 'matt@coldcrafthqteam.com',
    'matt@getcoldcrafthq.com', 'matt@gocoldcrafthq.com',
    'matt@hellocoldcrafthq.com', 'matt@hicoldcrafthq.com',
    'matt@mycoldcrafthq.com', 'matt@thecoldcrafthq.com',
    'matt@trycoldcrafthq.com', 'matt@usecoldcrafthq.com',
    'matt@withcoldcrafthq.com',
    'matthew@coldcrafthqapp.com', 'matthew@coldcrafthqco.com',
    'matthew@coldcrafthqgroup.com', 'matthew@coldcrafthqhub.com',
    'matthew@coldcrafthqlabs.com', 'matthew@coldcrafthqnow.com',
    'matthew@coldcrafthqteam.com', 'matthew@getcoldcrafthq.com',
    'matthew@gocoldcrafthq.com', 'matthew@hellocoldcrafthq.com',
    'matthew@hicoldcrafthq.com', 'matthew@mycoldcrafthq.com',
    'matthew@thecoldcrafthq.com', 'matthew@trycoldcrafthq.com',
    'matthew@usecoldcrafthq.com', 'matthew@withcoldcrafthq.com',
]

CAMPAIGNS = {
    'CC-List-RetainedRecruiters-A': {
        'csv': 'CC-List-RetainedRecruiters-A.csv',
        'niche_default': 'executive search',
        'accounts': ALL_INBOXES,
    },
    'CC-List-RetainedRecruiters-B': {
        'csv': 'CC-List-RetainedRecruiters-B.csv',
        'niche_default': 'executive search',
        'accounts': ALL_INBOXES,
    },
    'CC-List-SpecialistAgencies-A': {
        'csv': 'CC-List-SpecialistAgencies-A.csv',
        'niche_default': 'specialist B2B',
        'accounts': ALL_INBOXES,
    },
    'CC-List-SpecialistAgencies-B': {
        'csv': 'CC-List-SpecialistAgencies-B.csv',
        'niche_default': 'specialist B2B',
        'accounts': ALL_INBOXES,
    },
}

# Load sequences from JSON and transform to Instantly's expected shape.
# The source JSON has docs-only keys (`_README`, `_label`) that must be
# stripped, and each step needs `type: "email"` injected (Instantly's
# schema requires it).
with open(f'{ROOT}/scripts/campaigns/sequences/niche-2026-sequences.json') as f:
    SEQUENCES_JSON = json.load(f)


def _clean_variant(v: dict) -> dict:
    # Keep only the API-relevant keys; drop `_label` and any other underscore keys
    return {k: v[k] for k in ('subject', 'body') if k in v}


def _clean_step(s: dict) -> dict:
    return {
        'type': 'email',
        'delay': s.get('delay', 0),
        'variants': [_clean_variant(v) for v in s.get('variants', [])],
    }


SEQUENCES = {
    name: [{'steps': [_clean_step(s) for s in cfg['steps']]}]
    for name, cfg in SEQUENCES_JSON.items()
    if not name.startswith('_') and 'steps' in cfg
}

SCHEDULE = {
    'schedules': [{
        'name': 'Weekdays',
        'timing': {'from': '07:00', 'to': '10:30'},
        # Per Instantly v2 API docs: days keys are 0-6 (Sun-Sat) booleans,
        # NOT day-name strings. Production campaigns confirm this format.
        'days': {
            '0': False,  # Sunday
            '1': True,   # Monday
            '2': True,   # Tuesday
            '3': True,   # Wednesday
            '4': True,   # Thursday
            '5': True,   # Friday
            '6': False,  # Saturday
        },
        'timezone': 'America/New_York',
    }],
}

SETTINGS = {
    'daily_limit': 30,
    'stop_on_reply': True,
    'stop_on_auto_reply': True,
    'open_tracking': False,   # V9 lockdown
    'link_tracking': False,
    'text_only': True,
}


# Match end-anchored legal-entity suffixes (US + CA market). Strip ONLY
# these — "Group" / "Partners" / "& Associates" / "Company" are part of the
# brand and stay. Foreign suffixes like AB / AG / GmbH / SARL are
# DELIBERATELY excluded — short codes like "AB" case-insensitively match
# the trailing "ab" in legit names like "The Leaders Lab" and produce
# false strips ("The Leaders L"). The US+CA niche-2026 cohort doesn't
# have meaningful exposure to those entity types anyway.
_LEGAL_SUFFIX_RE = re.compile(
    r'\s*,?\s*(?:Inc\.?|LLC\.?|L\.L\.C\.?|Ltd\.?|Limited|Corp\.?|Corporation|Co\.|Pvt\.?\s*Ltd\.?|Private\s+Limited|PLC|Pty\.?\s*Ltd\.?)\.?\s*$',
    flags=re.IGNORECASE,
)


# Agency sub-niche rules. First match wins. Keywords matched case-insensitively
# against the combined blob of company_industry + company_name + headline + title.
# Order matters: more-specific specialisms before generic catch-alls.
# Each label slots into {{industryNiche}} so it must read naturally in:
#   "Most {{industryNiche}} agency founders..."
#   "companies that buy {{industryNiche}} services..."
#   "how this works for {{industryNiche}} agencies?"
_AGENCY_SUB_NICHE_RULES = [
    (['revops', 'revenue operations'], 'RevOps'),
    (['demand gen', 'demand generation'], 'demand-gen'),
    (['performance market', 'paid media', 'paid social', 'paid search'], 'performance marketing'),
    (['lifecycle market', 'crm agency', 'email market'], 'lifecycle marketing'),
    (['public relations', 'pr agency', 'pr firm', 'communications agency', 'communications firm'], 'PR'),
    (['content market', 'b2b content'], 'B2B content'),
    (['fractional cmo'], 'fractional CMO'),
    (['abm', 'account-based market', 'account based market'], 'ABM'),
    (['sales enablement'], 'sales enablement'),
    (['brand strateg', 'brand consultanc'], 'brand strategy'),
    (['management consult'], 'management consulting'),
    (['creative agenc', 'creative studio'], 'creative'),
]


def compute_sub_niche(row: dict, niche_default: str, campaign_name: str) -> str:
    """Map a lead row to a sharper {{industryNiche}} value than niche_default.

    Currently sharpens AGENCY leads only — recruiter templates hardcode
    "retained-search" in the copy so per-lead variation doesn't move the
    needle there.

    Returns niche_default as the fallback so the copy always renders cleanly.
    """
    # Recruiter cohort: pass through niche_default ("executive search").
    # Recruiter copy uses hardcoded "retained-search" framing — per-lead
    # variation isn't worth the misfire risk.
    if 'Agenc' not in campaign_name:
        return niche_default

    # Agency cohort: scan combined text for sub-vertical signals
    blob = ' '.join(filter(None, [
        row.get('company_industry', ''),
        row.get('company_name', ''),
        row.get('headline', ''),
        row.get('title', ''),
    ])).lower()

    for keywords, label in _AGENCY_SUB_NICHE_RULES:
        if any(kw in blob for kw in keywords):
            return label

    # Soft fallbacks from company_industry alone
    ind = (row.get('company_industry') or '').lower()
    if 'public relations' in ind:
        return 'PR'
    if 'marketing' in ind or 'advertising' in ind:
        return 'marketing'
    return niche_default  # "specialist B2B"


def normalize_company_name(name: str) -> str:
    """Strip legal-entity suffixes (Inc / LLC / Ltd / etc.) for cleaner copy
    rendering. Keeps brand-bearing words like Group / Partners / & Associates
    / Company that real prospects would expect to see in the email.

    Examples:
        "The Smart Agency, Inc."     -> "The Smart Agency"
        "Fusion Recruiters, LLC"     -> "Fusion Recruiters"
        "Acme Corp."                 -> "Acme"
        "The Grossman Group"         -> "The Grossman Group"   (unchanged)
        "Henkel Search Partners"     -> "Henkel Search Partners" (unchanged)
        "Harris, DeVille & Associates" -> "Harris, DeVille & Associates" (unchanged)
        "kg&a"                       -> "kg&a"                 (unchanged)
    """
    if not name:
        return ''
    cleaned = name.strip()
    # Strip once; pattern is end-anchored so chains like ", Inc., LLC" are rare
    # but we loop up to 2x in case of stacked suffixes
    for _ in range(2):
        new = _LEGAL_SUFFIX_RE.sub('', cleaned).strip()
        if new == cleaned:
            break
        cleaned = new
    # Strip trailing commas left over from the suffix removal
    cleaned = cleaned.rstrip(',').strip()
    return cleaned or name.strip()  # never return empty; fall back to original


def api_call(method: str, url: str, data: dict | None = None) -> tuple[int, str]:
    cmd = ['curl', '-s', '-w', '\n%{http_code}', '-X', method, url,
           '-H', f'Authorization: Bearer {API_KEY}',
           '-H', 'Content-Type: application/json']
    if data:
        cmd += ['-d', json.dumps(data)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    lines = result.stdout.rsplit('\n', 1)
    body = lines[0] if len(lines) > 1 else ''
    code = int(lines[-1]) if lines[-1].isdigit() else 0
    return code, body


def post_leads_bulk(campaign_id: str, leads: list[dict]) -> tuple[int, int, dict]:
    """POST a batch of up to 1000 leads to /api/v2/leads/add. Returns
    (status_code, uploaded_count, full_response_json).

    Each lead must include `email`; campaign_id goes at the request top level.
    Custom variables (e.g., industryNiche) belong inside lead['custom_variables'].
    """
    payload = {
        'campaign_id': campaign_id,
        'skip_if_in_workspace': False,
        'skip_if_in_campaign': True,
        'leads': leads,
    }
    result = subprocess.run(
        ['curl', '-s', '-w', '\n%{http_code}',
         '-X', 'POST', 'https://api.instantly.ai/api/v2/leads/add',
         '-H', f'Authorization: Bearer {API_KEY}',
         '-H', 'Content-Type: application/json',
         '-d', json.dumps(payload)],
        capture_output=True, text=True,
    )
    lines = result.stdout.rsplit('\n', 1)
    body = lines[0] if len(lines) > 1 else ''
    code = int(lines[-1]) if lines[-1].isdigit() else 0
    try:
        data = json.loads(body) if body else {}
    except json.JSONDecodeError:
        data = {'raw': body}
    uploaded = data.get('leads_uploaded', 0) if isinstance(data, dict) else 0
    return code, uploaded, data if isinstance(data, dict) else {}


def main() -> int:
    # Pre-flight: verify sending accounts are configured
    missing_accounts = [name for name, cfg in CAMPAIGNS.items() if not cfg['accounts']]
    if missing_accounts:
        print('=' * 60)
        print('ABORT: sending accounts not configured')
        print('=' * 60)
        print('Fill in the `accounts` list in this script before running.')
        print(f'Missing for: {missing_accounts}')
        return 2

    campaign_ids: dict[str, str] = {}

    # STEP 1: Create campaigns
    print('=' * 60)
    print('STEP 1: Creating 4 niche-2026 campaigns')
    print('=' * 60)

    for name in CAMPAIGNS:
        print(f'\n  Creating {name}...')
        code, body = api_call('POST', 'https://api.instantly.ai/api/v2/campaigns', {
            'name': name,
            'campaign_schedule': SCHEDULE,
        })
        if code == 200:
            resp = json.loads(body)
            cid = resp.get('id', '')
            campaign_ids[name] = cid
            print(f'    OK -> {cid}')
        else:
            print(f'    FAILED (HTTP {code}): {body[:200]}')
        time.sleep(1)

    # Save IDs for later reference / dryouts
    with open(f'{ROOT}/niche-2026-campaign-ids.json', 'w') as f:
        json.dump(campaign_ids, f, indent=2)
    print(f'\n  Saved {len(campaign_ids)} campaign IDs to niche-2026-campaign-ids.json')

    # STEP 2: PATCH settings
    print('\n' + '=' * 60)
    print('STEP 2: Patching campaign settings (V9 lockdown rules)')
    print('=' * 60)
    for name, cid in campaign_ids.items():
        code, body = api_call('PATCH', f'https://api.instantly.ai/api/v2/campaigns/{cid}', SETTINGS)
        print(f'  {name}: {"OK" if code == 200 else f"FAILED ({code})"}')
        time.sleep(0.5)

    # STEP 3: Add sequences
    print('\n' + '=' * 60)
    print('STEP 3: Adding email sequences')
    print('=' * 60)
    for name, cid in campaign_ids.items():
        seq = SEQUENCES.get(name)
        if not seq:
            print(f'  {name}: NO SEQUENCE DEFINED - skipping')
            continue
        code, body = api_call('PATCH', f'https://api.instantly.ai/api/v2/campaigns/{cid}',
                              {'sequences': seq})
        if code == 200:
            print(f'  {name}: 5-step sequence attached')
        else:
            print(f'  {name}: FAILED ({code}) - retrying...')
            time.sleep(2)
            code, body = api_call('PATCH', f'https://api.instantly.ai/api/v2/campaigns/{cid}',
                                  {'sequences': seq})
            print(f'  {name}: {"RETRY OK" if code == 200 else f"RETRY FAILED ({code})"}')
        time.sleep(1)

    # STEP 4: Assign sending accounts
    print('\n' + '=' * 60)
    print('STEP 4: Assigning sending accounts')
    print('=' * 60)
    for name, cid in campaign_ids.items():
        accounts = CAMPAIGNS[name]['accounts']
        code, body = api_call('PATCH', f'https://api.instantly.ai/api/v2/campaigns/{cid}',
                              {'email_list': accounts})
        if code == 200:
            print(f'  {name}: {len(accounts)} accounts assigned')
        else:
            print(f'  {name}: FAILED ({code}): {body[:200]}')
        time.sleep(0.5)

    # STEP 5: Import leads
    print('\n' + '=' * 60)
    print('STEP 5: Importing leads (paused state)')
    print('=' * 60)
    grand_total = 0
    grand_errors = 0
    for name, cid in campaign_ids.items():
        csv_file = os.path.join(LISTS_DIR, CAMPAIGNS[name]['csv'])
        niche_default = CAMPAIGNS[name]['niche_default']
        if not os.path.exists(csv_file):
            print(f'\n  {name}: CSV not found ({CAMPAIGNS[name]["csv"]}) - SKIP')
            continue

        leads = []
        with open(csv_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                email = (row.get('email') or '').strip()
                if not email:
                    continue
                # Niche: prefer an explicit row-level value, else compute
                # a sharper sub-niche from company_industry/name/headline,
                # else fall back to the campaign-level default.
                niche = (
                    (row.get('niche') or '').strip()
                    or compute_sub_niche(row, niche_default, name)
                )
                # Use full_name if first/last not split well
                first = (row.get('first_name') or '').strip()
                last = (row.get('last_name') or '').strip()
                # Normalize company name: strip Inc./LLC/Ltd/etc. for clean
                # copy rendering. Brand-bearing words (Group/Partners/Associates)
                # are preserved.
                company = normalize_company_name(row.get('company_name') or '')
                # CRITICAL: custom variables must go inside `custom_variables`
                # object (per Instantly v2 API docs). Top-level non-standard
                # fields are silently dropped, breaking {{industryNiche}}
                # rendering downstream.
                leads.append({
                    'email': email,
                    'first_name': first,
                    'last_name': last,
                    'company_name': company,
                    'custom_variables': {
                        'industryNiche': niche,
                    },
                })

        total = len(leads)
        print(f'\n  === {name} ({total} leads) ===')
        success = 0
        errors = 0
        start = time.time()
        # Bulk endpoint: up to 1000 leads/request. Push in batches.
        BATCH = 500  # well under the 1000 cap for safety
        for i in range(0, total, BATCH):
            batch = leads[i:i + BATCH]
            code, uploaded, resp = post_leads_bulk(cid, batch)
            if code == 200:
                success += uploaded
                dupe = resp.get('duplicated_leads', 0) or 0
                invalid = resp.get('invalid_email_count', 0) or 0
                skipped = resp.get('skipped_count', 0) or 0
                if dupe or invalid or skipped:
                    print(f'    Batch {i // BATCH + 1}: uploaded={uploaded} '
                          f'dupe={dupe} invalid={invalid} skipped={skipped}')
                else:
                    print(f'    Batch {i // BATCH + 1}: uploaded={uploaded}')
            else:
                errors += len(batch)
                err_summary = str(resp)[:300]
                print(f'    Batch {i // BATCH + 1}: FAILED HTTP {code}: {err_summary}')
            time.sleep(0.5)  # polite pacing between batches
        elapsed = time.time() - start
        print(f'    Done: {success} imported, {errors} errors in {elapsed:.0f}s')
        grand_total += success
        grand_errors += errors

    # SUMMARY
    print('\n' + '=' * 60)
    print('COMPLETE — all 4 campaigns paused, awaiting Task 14 manual QA')
    print('=' * 60)
    print(f'  Campaigns created: {len(campaign_ids)}')
    print(f'  Leads imported:    {grand_total}')
    print(f'  Import errors:     {grand_errors}')
    print()
    for name, cid in campaign_ids.items():
        accts = len(CAMPAIGNS[name]['accounts'])
        print(f'  {name:35s} -> {cid}  ({accts} accounts)')
    print()
    return 0


if __name__ == '__main__':
    import sys
    sys.exit(main())
