#!/usr/bin/env python3
"""Convert standard {a|b|c} spintax to Instantly's {{RANDOM |a|b|c}} syntax
across all niche-2026 campaigns. Updates the source JSON in place and PATCHes
each live campaign's sequences via the Instantly API.

Bug discovered when a test-send showed raw {a|b|c} blocks in the rendered
email instead of expanded variations. Instantly's spintax engine ignores
standard syntax and requires the {{RANDOM|...}} form documented at
https://help.instantly.ai/en/articles/6384663-how-to-use-spintax.
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.expanduser('~/Documents/coldcrafthq')
SEQ_FILE = f'{ROOT}/scripts/campaigns/sequences/niche-2026-sequences.json'
IDS_FILE = f'{ROOT}/niche-2026-campaign-ids.json'

# Load Instantly API key
API_KEY = ''
with open(f'{ROOT}/.env.prod') as f:
    for line in f:
        if line.startswith('INSTANTLY_API_KEY='):
            API_KEY = line.strip().split('=', 1)[1].strip('"').strip("'")
            break
assert API_KEY, 'INSTANTLY_API_KEY not found in .env.prod'


def transform_spintax(text: str) -> str:
    """Convert {a|b|c} -> {{RANDOM |a|b|c}}, leaving {{var}} tokens intact.

    Protects {{...}} via sentinel chars during the transform so the spintax
    regex only matches single-brace blocks. Nested {{var}} inside spintax
    options is preserved (Instantly supports nested vars).
    """
    if not text:
        return text
    # Protect {{...}} tokens (any variable like {{firstName}}, {{companyName}})
    protected = text.replace('{{', '\x00').replace('}}', '\x01')
    # Match {X|Y|Z} where X/Y/Z contain neither { nor } (they were protected)
    # and at least one pipe is present (excludes already-converted forms).
    def repl(m):
        inner = m.group(1)
        return '\x00RANDOM |' + inner + '\x01'
    transformed = re.sub(r'\{([^{}]*\|[^{}]*)\}', repl, protected)
    # Restore {{...}} tokens (both original variables and our new RANDOM wrappers)
    return transformed.replace('\x00', '{{').replace('\x01', '}}')


def api_patch(campaign_id: str, sequences: list) -> tuple[int, str]:
    result = subprocess.run(
        ['curl', '-s', '-w', '\n%{http_code}', '-X', 'PATCH',
         f'https://api.instantly.ai/api/v2/campaigns/{campaign_id}',
         '-H', f'Authorization: Bearer {API_KEY}',
         '-H', 'Content-Type: application/json',
         '-d', json.dumps({'sequences': sequences})],
        capture_output=True, text=True,
    )
    lines = result.stdout.rsplit('\n', 1)
    body = lines[0] if len(lines) > 1 else ''
    code = int(lines[-1]) if lines[-1].isdigit() else 0
    return code, body


def transform_sequences_payload(steps: list) -> list:
    """Take a list of sequence steps (with type/delay/variants) and return
    a new list with all subject + body text spintax-transformed."""
    out = []
    for step in steps:
        new_variants = []
        for v in step.get('variants', []):
            new_variants.append({
                'subject': transform_spintax(v.get('subject', '')),
                'body': transform_spintax(v.get('body', '')),
            })
        out.append({
            'type': step.get('type', 'email'),
            'delay': step.get('delay', 0),
            'variants': new_variants,
        })
    return out


def main() -> int:
    # 1. Load source JSON
    with open(SEQ_FILE) as f:
        seqs = json.load(f)

    # 2. Transform in place
    changes = 0
    for cname, cfg in seqs.items():
        if cname.startswith('_') or 'steps' not in cfg:
            continue
        for step in cfg['steps']:
            for v in step.get('variants', []):
                old_subj = v.get('subject', '')
                old_body = v.get('body', '')
                new_subj = transform_spintax(old_subj)
                new_body = transform_spintax(old_body)
                if new_subj != old_subj or new_body != old_body:
                    changes += 1
                v['subject'] = new_subj
                v['body'] = new_body

    # 3. Write back to source JSON
    with open(SEQ_FILE, 'w') as f:
        json.dump(seqs, f, indent=2, ensure_ascii=False)
    print(f'Transformed {changes} variants in {SEQ_FILE}')

    # 4. Show one rendered preview so we can eyeball
    sample_campaign = 'CC-List-RetainedRecruiters-A'
    if sample_campaign in seqs:
        sample = seqs[sample_campaign]['steps'][0]['variants'][0]
        print(f'\n--- Sample after transform ({sample_campaign}, Day 0 Variant 1) ---')
        print(f'Subject: {sample["subject"]}')
        print()
        print(sample['body'])
        print('---')

    # 5. PATCH each live campaign's sequences
    if not os.path.exists(IDS_FILE):
        print(f'\n[skip] {IDS_FILE} not found — JSON updated but no API PATCH.')
        return 0
    ids = json.load(open(IDS_FILE))
    print(f'\nPATCHing {len(ids)} campaigns with fixed spintax...')
    fails = 0
    for cname, cid in ids.items():
        cfg = seqs.get(cname)
        if not cfg or 'steps' not in cfg:
            print(f'  {cname}: NO SEQUENCE — skip')
            continue
        # Build the Instantly-shaped payload: [{steps:[{type,delay,variants}]}]
        payload = [{'steps': transform_sequences_payload(cfg['steps'])}]
        code, body = api_patch(cid, payload)
        if code == 200:
            print(f'  {cname}: PATCH OK')
        else:
            print(f'  {cname}: FAILED ({code}): {body[:200]}')
            fails += 1
    return 0 if fails == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
