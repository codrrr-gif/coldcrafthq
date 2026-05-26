#!/usr/bin/env python3
"""Apply niche-specific scoring and split each metadata CSV into Tier A / Tier B
segments. Drops anything below the Tier B threshold.

The AI Ark metadata schema uses column names that don't match the scorer's
canonical names (company_headcount_start vs company_headcount, person_country
vs company_location). This script does the mapping at the boundary so the
scoring module stays simple.

Firmographic-only mode (no signal columns present) → tier_for_score uses
the 65/50/<50 thresholds. If/when V10 signal enrichment ships, set
SIGNALS_PRESENT = True to switch to the original 90/70/<70 gates.
"""
import csv
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(__file__))
from lib.niche_scoring import score_lead, tier_for_score, RECRUITER_ICP, AGENCY_ICP

ROOT = os.path.expanduser('~/Documents/coldcrafthq')
SIGNALS_PRESENT = False  # V10 follow-up: flip to True once signal columns exist

INPUTS = [
    {
        'in':  f'{ROOT}/data/niche-2026/metadata-recruiters.csv',
        'out_a': f'{ROOT}/data/niche-2026/scored-recruiters-A.csv',
        'out_b': f'{ROOT}/data/niche-2026/scored-recruiters-B.csv',
        'icp': RECRUITER_ICP,
    },
    {
        'in':  f'{ROOT}/data/niche-2026/metadata-agencies.csv',
        'out_a': f'{ROOT}/data/niche-2026/scored-agencies-A.csv',
        'out_b': f'{ROOT}/data/niche-2026/scored-agencies-B.csv',
        'icp': AGENCY_ICP,
    },
]


def normalize_for_scoring(r: dict) -> dict:
    """Shallow-copy r with the canonical columns the scorer needs.
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


def process(cfg: dict) -> tuple[int, int, int]:
    """Run scoring on one niche. Returns (tier_a_count, tier_b_count, drop_count)."""
    with open(cfg['in'], newline='') as f:
        rows = list(csv.DictReader(f))
    print(f"\nScoring {len(rows)} rows from {os.path.basename(cfg['in'])}")

    a_rows, b_rows = [], []
    tier_counts = Counter()
    score_hist: dict[int, int] = {}

    for r in rows:
        normalized = normalize_for_scoring(r)
        s = score_lead(normalized, cfg['icp'])
        t = tier_for_score(s, signals_present=SIGNALS_PRESENT)
        bucket = (s // 10) * 10
        score_hist[bucket] = score_hist.get(bucket, 0) + 1

        r['icp_score'] = str(s)
        r['icp_tier'] = t or 'DROP'
        tier_counts[r['icp_tier']] += 1

        if t == 'A':
            a_rows.append(r)
        elif t == 'B':
            b_rows.append(r)

    total = len(rows)
    print(f"  Tier A: {tier_counts['A']:>5} ({100*tier_counts['A']/total:5.1f}%)")
    print(f"  Tier B: {tier_counts['B']:>5} ({100*tier_counts['B']/total:5.1f}%)")
    print(f"  Drop:   {tier_counts['DROP']:>5} ({100*tier_counts['DROP']/total:5.1f}%)")
    print(f"  Score histogram (by 10s):")
    for bucket in sorted(score_hist.keys()):
        bar = '#' * (score_hist[bucket] * 40 // total)
        print(f"    {bucket:>3}: {score_hist[bucket]:>5} {bar}")

    for path, rows_out in [(cfg['out_a'], a_rows), (cfg['out_b'], b_rows)]:
        if not rows_out:
            print(f"  [warn] no rows for {os.path.basename(path)}")
            continue
        with open(path, 'w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=list(rows_out[0].keys()))
            w.writeheader()
            w.writerows(rows_out)
        print(f"  wrote {len(rows_out):>5} → {os.path.basename(path)}")

    return tier_counts['A'], tier_counts['B'], tier_counts['DROP']


def main() -> int:
    total_a = total_b = total_drop = 0
    for cfg in INPUTS:
        a, b, d = process(cfg)
        total_a += a
        total_b += b
        total_drop += d

    survivors = total_a + total_b
    print(f"\n=== Combined ===")
    print(f"  Total Tier A: {total_a}")
    print(f"  Total Tier B: {total_b}")
    print(f"  Total Drop:   {total_drop}")
    print(f"  Survivors (A+B): {survivors}")
    print(f"\nTask 10 credit forecast: ~{survivors} credits (1 per landed email)")
    print(f"  worst-case ceiling. Real cost likely 70-85% of this after BounceBan misses.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
