#!/usr/bin/env python3
"""Convert \\n\\n paragraph breaks to <br><br> HTML breaks so they render
in email clients. Also flips text_only=false on each campaign (HTML email
with line breaks, but no styling, no images, no link tracking, no open
tracking — visually identical to plain text but with proper paragraph
breaks).

Caught when a test-send showed the entire email body as a single wall of
text — Instantly's text_only mode does not render \\n\\n as paragraph
breaks reliably across all clients (notably Gmail).
"""
import json
import os
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


def add_html_breaks(text: str) -> str:
    """Replace each \\n\\n with <br><br>\\n\\n. The trailing \\n\\n stays so
    the source JSON is still readable; the <br><br> ensures the rendered
    email shows paragraph breaks regardless of plain-text-mode quirks.
    """
    if not text:
        return text
    return text.replace('\n\n', '<br><br>\n\n')


def transform_steps(steps: list) -> list:
    out = []
    for step in steps:
        new_variants = []
        for v in step.get('variants', []):
            new_variants.append({
                'subject': v.get('subject', ''),  # subjects don't have line breaks
                'body': add_html_breaks(v.get('body', '')),
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

    # Transform in place (idempotent — if already has <br><br>\n\n, no change)
    changes = 0
    for cname, cfg in seqs.items():
        if cname.startswith('_') or 'steps' not in cfg:
            continue
        for step in cfg['steps']:
            for v in step.get('variants', []):
                old = v.get('body', '')
                if '<br><br>' in old:
                    continue  # already transformed
                new = add_html_breaks(old)
                if new != old:
                    v['body'] = new
                    changes += 1

    with open(SEQ_FILE, 'w') as f:
        json.dump(seqs, f, indent=2, ensure_ascii=False)
    print(f'Transformed {changes} variants in {SEQ_FILE}')

    # Sample preview
    sample_campaign = 'CC-List-SpecialistAgencies-A'
    if sample_campaign in seqs:
        sample = seqs[sample_campaign]['steps'][0]['variants'][0]
        print(f'\n--- Sample after transform ({sample_campaign}, Day 0 Variant 1) ---')
        print(sample['body'])
        print('---')

    # PATCH each live campaign with updated body + text_only=false
    if not os.path.exists(IDS_FILE):
        print(f'\n[skip] {IDS_FILE} not found')
        return 0
    ids = json.load(open(IDS_FILE))
    print(f'\nPATCHing {len(ids)} campaigns (sequences + text_only=false)...')
    fails = 0
    for cname, cid in ids.items():
        cfg = seqs.get(cname)
        if not cfg or 'steps' not in cfg:
            print(f'  {cname}: NO SEQUENCE — skip')
            continue
        payload = {
            'sequences': [{'steps': transform_steps(cfg['steps'])}],
            'text_only': False,  # HTML email to preserve line breaks
        }
        code, body = api_patch(cid, payload)
        if code == 200:
            print(f'  {cname}: PATCH OK')
        else:
            print(f'  {cname}: FAILED ({code}): {body[:200]}')
            fails += 1
    return 0 if fails == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
