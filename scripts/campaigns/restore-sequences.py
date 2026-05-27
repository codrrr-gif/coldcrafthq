#!/usr/bin/env python3
"""Emergency restore: re-PATCH all 4 niche-2026 campaigns with the clean
spintax-fixed bodies (no <br> tags) and text_only=true. Used to revert the
broken <br><br> + text_only=false state where Instantly's HTML sanitizer
stripped all body text content.

Reads the niche-2026-sequences.json source. STRIPS any <br><br> tags first
(in case the source got polluted by the earlier paragraph-break attempt)
so we PATCH with the clean text + spintax + variables.
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.expanduser('~/Documents/coldcrafthq')
SEQ_FILE = f'{ROOT}/scripts/campaigns/sequences/niche-2026-sequences.json'
IDS_FILE = f'{ROOT}/niche-2026-campaign-ids.json'

API_KEY = ''
with open(f'{ROOT}/.env.prod') as f:
    for line in f:
        if line.startswith('INSTANTLY_API_KEY='):
            API_KEY = line.strip().split('=', 1)[1].strip('"').strip("'")
            break
assert API_KEY


def strip_html_breaks(text: str) -> str:
    """Remove any <br>, <br/>, <br /> tags but PRESERVE surrounding whitespace
    (newlines must survive)."""
    if not text:
        return text
    return re.sub(r'<br\s*/?>', '', text, flags=re.IGNORECASE)


def transform_steps(steps: list) -> list:
    out = []
    for step in steps:
        new_variants = []
        for v in step.get('variants', []):
            new_variants.append({
                'subject': strip_html_breaks(v.get('subject', '')),
                'body': strip_html_breaks(v.get('body', '')),
            })
        out.append({
            'type': step.get('type', 'email'),
            'delay': step.get('delay', 0),
            'variants': new_variants,
        })
    return out


def api_patch(campaign_id: str, payload: dict) -> tuple[int, str]:
    result = subprocess.run(
        ['curl', '-s', '-w', '\n%{http_code}', '-X', 'PATCH',
         f'https://api.instantly.ai/api/v2/campaigns/{campaign_id}',
         '-H', f'Authorization: Bearer {API_KEY}',
         '-H', 'Content-Type: application/json',
         '-d', json.dumps(payload)],
        capture_output=True, text=True,
    )
    lines = result.stdout.rsplit('\n', 1)
    body = lines[0] if len(lines) > 1 else ''
    code = int(lines[-1]) if lines[-1].isdigit() else 0
    return code, body


def main() -> int:
    with open(SEQ_FILE) as f:
        seqs = json.load(f)

    # Clean the source JSON in case it has <br> tags lingering
    cleaned = 0
    for cname, cfg in seqs.items():
        if cname.startswith('_') or 'steps' not in cfg:
            continue
        for step in cfg['steps']:
            for v in step.get('variants', []):
                for field in ('subject', 'body'):
                    old = v.get(field, '')
                    new = strip_html_breaks(old)
                    if new != old:
                        v[field] = new
                        cleaned += 1
    with open(SEQ_FILE, 'w') as f:
        json.dump(seqs, f, indent=2, ensure_ascii=False)
    print(f'Cleaned {cleaned} fields of <br> tags in source JSON')

    sample_campaign = 'CC-List-SpecialistAgencies-A'
    if sample_campaign in seqs:
        sample = seqs[sample_campaign]['steps'][0]['variants'][0]
        print(f'\n--- Restored body (sample: {sample_campaign}, Day 0 V1) ---')
        print(sample['body'])
        print('---')

    ids = json.load(open(IDS_FILE))
    print(f'\nPATCHing {len(ids)} campaigns (restore body + text_only=true)...')
    fails = 0
    for cname, cid in ids.items():
        cfg = seqs.get(cname)
        if not cfg or 'steps' not in cfg:
            print(f'  {cname}: NO SEQUENCE — skip')
            continue
        payload = {
            'sequences': [{'steps': transform_steps(cfg['steps'])}],
            'text_only': True,
        }
        code, body = api_patch(cid, payload)
        if code == 200:
            print(f'  {cname}: PATCH OK')
        else:
            print(f'  {cname}: FAILED ({code}): {body[:300]}')
            fails += 1
    return 0 if fails == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
