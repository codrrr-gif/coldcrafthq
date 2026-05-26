#!/usr/bin/env python3
"""Stage 1 (agencies): pull up to 5K METADATA records from AI Ark /people.
Casts wide on industry; specialist filtering happens in scoring (Task 9).
Output streams to CSV page-by-page; retry-on-transient handles ECONNRESET.
"""
import os
import subprocess
import sys

ROOT = os.path.expanduser('~/Documents/coldcrafthq')
PARAMS = f'{ROOT}/data/niche-2026/params-specialist-agencies.json'
OUT = f'{ROOT}/data/niche-2026/metadata-agencies.csv'

def load_env() -> dict:
    env = os.environ.copy()
    with open(f'{ROOT}/.env.prod') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k] = v.strip('"').strip("'")
    return env

def main() -> int:
    os.chdir(ROOT)
    env = load_env()
    cmd = ['npx', 'tsx', 'scripts/campaigns/ai-ark-cli.ts', 'search-people',
           f'--params={PARAMS}', f'--out={OUT}']
    print(f'Running: {" ".join(cmd)}')
    result = subprocess.run(cmd, env=env)
    return result.returncode

if __name__ == '__main__':
    sys.exit(main())
