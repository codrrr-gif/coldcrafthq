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
from concurrent.futures import ThreadPoolExecutor, as_completed

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

# ── Campaigns to create ─────────────────────────────────────────────────
# IMPORTANT: Fill in 'accounts' with REAL sending-account emails BEFORE running.
# Each campaign needs its own dedicated pool (do not reuse pools across niche-2026
# AND the existing 14 campaigns — that would double-up sends and burn deliverability).
# Recommendation: 3 inboxes per campaign at 30/day each = 90/day per campaign.

CAMPAIGNS = {
    'CC-List-RetainedRecruiters-A': {
        'csv': 'CC-List-RetainedRecruiters-A.csv',
        'niche_default': 'executive search',
        'accounts': [
            # FILL IN: e.g., 'matt@search-coldcrafthq.com', 'matt.m@search-coldcrafthq.com', ...
        ],
    },
    'CC-List-RetainedRecruiters-B': {
        'csv': 'CC-List-RetainedRecruiters-B.csv',
        'niche_default': 'executive search',
        'accounts': [
            # FILL IN
        ],
    },
    'CC-List-SpecialistAgencies-A': {
        'csv': 'CC-List-SpecialistAgencies-A.csv',
        'niche_default': 'specialist B2B agency',
        'accounts': [
            # FILL IN
        ],
    },
    'CC-List-SpecialistAgencies-B': {
        'csv': 'CC-List-SpecialistAgencies-B.csv',
        'niche_default': 'specialist B2B agency',
        'accounts': [
            # FILL IN
        ],
    },
}

# Load sequences from JSON
with open(f'{ROOT}/scripts/campaigns/sequences/niche-2026-sequences.json') as f:
    SEQUENCES_JSON = json.load(f)
# Each campaign's `steps` array goes into Instantly's `sequences` field as
# `{"sequences":[{"steps":[...]}]}`
SEQUENCES = {name: [{'steps': cfg['steps']}] for name, cfg in SEQUENCES_JSON.items()}

SCHEDULE = {
    'schedules': [{
        'name': 'Weekdays',
        'timing': {'from': '07:00', 'to': '10:30'},
        'days': {
            'monday': True, 'tuesday': True, 'wednesday': True,
            'thursday': True, 'friday': True,
            'saturday': False, 'sunday': False,
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


def post_lead(lead_data: dict) -> bool:
    result = subprocess.run(
        ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}',
         '-X', 'POST', 'https://api.instantly.ai/api/v2/leads',
         '-H', f'Authorization: Bearer {API_KEY}',
         '-H', 'Content-Type: application/json',
         '-d', json.dumps(lead_data)],
        capture_output=True, text=True,
    )
    return result.stdout.strip() == '200'


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
                # Niche default — falls back if row didn't carry one
                niche = (row.get('niche') or '').strip() or niche_default
                # Use full_name if first/last not split well
                first = (row.get('first_name') or '').strip()
                last = (row.get('last_name') or '').strip()
                # Normalize company name: strip Inc./LLC/Ltd/etc. for clean
                # copy rendering ("Spent 20 min on Acme this morning" reads
                # better than "Spent 20 min on Acme Recruiting, LLC this
                # morning"). Brand-bearing words (Group/Partners/Associates)
                # are preserved.
                company = normalize_company_name(row.get('company_name') or '')
                leads.append({
                    'email': email,
                    'first_name': first,
                    'last_name': last,
                    'company_name': company,
                    'campaign': cid,
                    'industryNiche': niche,
                })

        total = len(leads)
        print(f'\n  === {name} ({total} leads) ===')
        success = 0
        errors = 0
        start = time.time()
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(post_lead, lead): i for i, lead in enumerate(leads)}
            for future in as_completed(futures):
                try:
                    if future.result():
                        success += 1
                    else:
                        errors += 1
                except Exception:
                    errors += 1
                done = success + errors
                if done % 100 == 0 or done == total:
                    elapsed = time.time() - start
                    rate = done / elapsed if elapsed > 0 else 0
                    eta = (total - done) / rate if rate > 0 else 0
                    print(f'    Progress: {done}/{total} ({success} ok, {errors} err) '
                          f'[{rate:.1f}/s, ETA {eta:.0f}s]')
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
