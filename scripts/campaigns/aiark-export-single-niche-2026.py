#!/usr/bin/env python3
"""Stage 4: spend AI Ark credits for BounceBan-verified emails on the 5,190
Tier A + B survivors of niche-2026. Uses /people/export/single per-record
(cleaner than the async /people/export+webhook flow for this scope).

Cost: ~1 credit per found email, ~0 per miss.
Forecast: ~5,190 credits worst-case, realistically ~4,400 (BounceBan ~85% find rate).

For each tier CSV:
  1. Read the scored metadata rows (each has aiark_person_id)
  2. For each row, call ai-ark-cli.ts export-single --id=<aiark_person_id>
  3. Parse the JSON result; if found, append a row to the per-tier output CSV
     (joining the verified email + verification status onto the original
     metadata)
  4. Stream to disk after each record so a crash preserves what's paid for
  5. Dedupe against the existing 18K-lead universe in /segmented-lists/
     during the join step (not before — we don't know the email until after
     export)

Output: 4 final CSVs in /segmented-lists/:
  CC-List-RetainedRecruiters-A.csv
  CC-List-RetainedRecruiters-B.csv
  CC-List-SpecialistAgencies-A.csv
  CC-List-SpecialistAgencies-B.csv

Resumability: if the output CSV already exists with rows, we skip aiark_person_ids
already present in it (no double-charging). The retry on transient errors lives
in the TS client.
"""
import csv
import glob
import json
import os
import subprocess
import sys
import time
from typing import Set

ROOT = os.path.expanduser('~/Documents/coldcrafthq')
SEG_DIR = f'{ROOT}/segmented-lists'

JOBS = [
    {
        'scored_csv':  f'{ROOT}/data/niche-2026/scored-recruiters-A.csv',
        'final_csv':   f'{SEG_DIR}/CC-List-RetainedRecruiters-A.csv',
        'label':       'recruiters-A',
    },
    {
        'scored_csv':  f'{ROOT}/data/niche-2026/scored-recruiters-B.csv',
        'final_csv':   f'{SEG_DIR}/CC-List-RetainedRecruiters-B.csv',
        'label':       'recruiters-B',
    },
    {
        'scored_csv':  f'{ROOT}/data/niche-2026/scored-agencies-A.csv',
        'final_csv':   f'{SEG_DIR}/CC-List-SpecialistAgencies-A.csv',
        'label':       'agencies-A',
    },
    {
        'scored_csv':  f'{ROOT}/data/niche-2026/scored-agencies-B.csv',
        'final_csv':   f'{SEG_DIR}/CC-List-SpecialistAgencies-B.csv',
        'label':       'agencies-B',
    },
]

CLI = ['npx', 'tsx', 'scripts/campaigns/ai-ark-cli.ts']
THROTTLE_S = 0.22  # 5 req/s + safety; matches the TS client's inter-page delay


def load_env() -> dict:
    env = os.environ.copy()
    with open(f'{ROOT}/.env.prod') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k] = v.strip('"').strip("'")
    return env


def get_credits(env: dict) -> float:
    r = subprocess.run(CLI + ['credits'], env=env, capture_output=True, text=True, check=True)
    return float(json.loads(r.stdout.strip())['total'])


def existing_dedupe_set(skip_paths: Set[str]) -> Set[str]:
    """Collect every email already loaded across existing segmented lists."""
    seen: Set[str] = set()
    for path in glob.glob(f'{SEG_DIR}/CC-List-*.csv'):
        if path in skip_paths:
            continue
        try:
            with open(path, newline='') as f:
                for r in csv.DictReader(f):
                    e = (r.get('email') or '').strip().lower()
                    if e:
                        seen.add(e)
        except Exception as ex:
            print(f'  [warn] could not read {path}: {ex}', file=sys.stderr)
    return seen


def already_processed_ids(final_csv: str) -> tuple[Set[str], list[str] | None]:
    """If the final CSV already exists, collect its aiark_person_ids so we
    don't re-export them (saves credits on resume)."""
    if not os.path.exists(final_csv):
        return set(), None
    ids: Set[str] = set()
    fieldnames: list[str] | None = None
    try:
        with open(final_csv, newline='') as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            for r in reader:
                pid = (r.get('aiark_person_id') or '').strip()
                if pid:
                    ids.add(pid)
    except Exception as ex:
        print(f'  [warn] could not parse existing {final_csv}: {ex}', file=sys.stderr)
        return set(), None
    return ids, fieldnames


def call_export_single(aiark_id: str, env: dict) -> dict:
    """Returns {found: bool, email?: str, emailStatus?: str, ...}.
    Returns {found: False, error: str} on subprocess failure (retry already
    happens inside the TS client; if it still fails after 3 retries we treat
    as a miss for this record and move on.)
    """
    try:
        r = subprocess.run(
            CLI + ['export-single', f'--id={aiark_id}'],
            env=env, capture_output=True, text=True, timeout=60,
        )
        if r.returncode != 0:
            return {'found': False, 'error': r.stderr.strip()[:200]}
        return json.loads(r.stdout.strip())
    except subprocess.TimeoutExpired:
        return {'found': False, 'error': 'timeout'}
    except Exception as ex:
        return {'found': False, 'error': str(ex)}


def process_job(job: dict, env: dict, dedupe_set: Set[str]) -> dict:
    """Process one tier CSV. Returns stats dict."""
    label = job['label']
    print(f"\n--- {label} ---")

    with open(job['scored_csv'], newline='') as f:
        scored = list(csv.DictReader(f))
    print(f"  scored: {len(scored)} rows")

    processed_ids, existing_fieldnames = already_processed_ids(job['final_csv'])
    if processed_ids:
        print(f"  resume: {len(processed_ids)} rows already in {os.path.basename(job['final_csv'])} — skipping")

    # Output fieldnames = scored fields + verified-email fields. Use existing
    # if resuming so the column layout matches.
    out_fieldnames = existing_fieldnames or (
        list(scored[0].keys()) + ['email', 'email_status', 'email_substatus', 'email_domain_type']
    )

    # Open in append mode if resuming; truncate + write header if fresh.
    fresh = not processed_ids
    fmode = 'w' if fresh else 'a'
    out_f = open(job['final_csv'], fmode, newline='')
    writer = csv.DictWriter(out_f, fieldnames=out_fieldnames, extrasaction='ignore')
    if fresh:
        writer.writeheader()

    stats = {
        'attempted': 0, 'found': 0, 'missed': 0, 'errored': 0,
        'duped': 0, 'written': 0, 'skipped_resume': 0,
    }

    start = time.time()
    for i, row in enumerate(scored):
        pid = (row.get('aiark_person_id') or '').strip()
        if not pid:
            stats['errored'] += 1
            continue
        if pid in processed_ids:
            stats['skipped_resume'] += 1
            continue

        result = call_export_single(pid, env)
        stats['attempted'] += 1

        if not result.get('found'):
            if result.get('error'):
                stats['errored'] += 1
            else:
                stats['missed'] += 1
        else:
            email = (result.get('email') or '').strip().lower()
            if not email:
                stats['missed'] += 1
            elif email in dedupe_set:
                stats['duped'] += 1
            else:
                stats['found'] += 1
                dedupe_set.add(email)
                merged = {**row,
                          'email': email,
                          'email_status': result.get('emailStatus', ''),
                          'email_substatus': result.get('emailSubStatus', ''),
                          'email_domain_type': result.get('emailDomainType', '')}
                writer.writerow(merged)
                out_f.flush()
                stats['written'] += 1

        if (i + 1) % 50 == 0:
            elapsed = time.time() - start
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            print(f"  [{label}] {i + 1}/{len(scored)} "
                  f"found={stats['found']} missed={stats['missed']} dupe={stats['duped']} "
                  f"err={stats['errored']} | {rate:.1f}/s")

        time.sleep(THROTTLE_S)

    out_f.close()
    print(f"  done in {time.time() - start:.0f}s — {json.dumps(stats)}")
    return stats


def main() -> int:
    os.chdir(ROOT)
    env = load_env()

    # Pre-flight credit gate
    credits_before = get_credits(env)
    scoped_total = sum(
        sum(1 for _ in csv.DictReader(open(j['scored_csv'])))
        for j in JOBS if os.path.exists(j['scored_csv'])
    )
    print(f"\n=== PRE-FLIGHT ===")
    print(f"Credit balance:        {credits_before:.1f}")
    print(f"Records to attempt:    {scoped_total}")
    print(f"Worst-case spend:      {scoped_total}cr (1 per landed email)")
    print(f"Expected actual:       ~{int(scoped_total * 0.85)}cr (15% miss rate)")
    if scoped_total > credits_before * 0.9:
        print(f"\nABORT: forecast > 90% of balance. Tighten cohorts or top up.")
        return 2
    print("Proceeding...\n")

    # Build dedupe set from existing /segmented-lists/ EXCLUDING our outputs
    # (those are partial-resume safe via already_processed_ids).
    skip_paths = {j['final_csv'] for j in JOBS}
    dedupe_set = existing_dedupe_set(skip_paths)
    print(f"Universe dedupe set: {len(dedupe_set)} existing emails\n")

    all_stats = {}
    for job in JOBS:
        if not os.path.exists(job['scored_csv']):
            print(f"[skip] {job['scored_csv']} missing")
            continue
        all_stats[job['label']] = process_job(job, env, dedupe_set)

    credits_after = get_credits(env)
    print(f"\n=== SUMMARY ===")
    for label, s in all_stats.items():
        print(f"  {label}: found={s['found']} duped={s['duped']} missed={s['missed']} errored={s['errored']} → wrote {s['written']}")
    total_written = sum(s['written'] for s in all_stats.values())
    print(f"\n  Total verified emails written: {total_written}")
    print(f"  Credits before: {credits_before:.1f}")
    print(f"  Credits after:  {credits_after:.1f}")
    print(f"  Credits spent:  {credits_before - credits_after:.1f}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
