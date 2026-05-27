#!/usr/bin/env tsx
// Task 10 orchestrator — TypeScript version (replaces the Python wrapper).
//
// Why TS instead of Python:
//   Per-record `npx tsx` subprocess startup (~500-1000ms) bottlenecked the
//   Python version at ~12 finds/min. This script does the whole loop
//   in-process (~5-10x faster) — should land 5,190 records in 15-25 minutes
//   instead of 2-7 hours.
//
// What it does:
//   1. Pre-flight credit check (aborts if forecast > 90% of balance)
//   2. Builds dedupe set from existing /segmented-lists/CC-List-*.csv
//      (skips niche-2026 outputs so resume works correctly)
//   3. For each of 4 scored tier CSVs:
//      a. Read scored metadata rows
//      b. Resume: skip aiark_person_ids already in the output CSV
//      c. For each remaining row, call exportPersonSingle()
//      d. If found + email not in dedupe set: append to per-tier final CSV
//      e. Stream to disk after each write (resilience)
//      f. ~220ms throttle between records
//   4. Final summary

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { exportPersonSingle, getCredits } from '../../src/lib/sources/ai-ark';

const ROOT = process.env.HOME + '/Documents/coldcrafthq';
const SEG_DIR = `${ROOT}/segmented-lists`;
// AI Ark allows 5 req/s per token. With per-call latency of 3-30s, 5 concurrent
// workers naturally pace us at ~1 call/s/worker = 5 req/s peak — at or under
// the rate limit. No additional throttle needed (and the retry-on-429 layer
// in the client backstops any overage). Throughput: ~60 records/min vs ~12
// for the serial version.
const CONCURRENCY = 5;

interface Job {
  scoredCsv: string;
  finalCsv: string;
  label: string;
}

const JOBS: Job[] = [
  {
    scoredCsv: `${ROOT}/data/niche-2026/scored-recruiters-A.csv`,
    finalCsv:  `${SEG_DIR}/CC-List-RetainedRecruiters-A.csv`,
    label:     'recruiters-A',
  },
  {
    scoredCsv: `${ROOT}/data/niche-2026/scored-recruiters-B.csv`,
    finalCsv:  `${SEG_DIR}/CC-List-RetainedRecruiters-B.csv`,
    label:     'recruiters-B',
  },
  {
    scoredCsv: `${ROOT}/data/niche-2026/scored-agencies-A.csv`,
    finalCsv:  `${SEG_DIR}/CC-List-SpecialistAgencies-A.csv`,
    label:     'agencies-A',
  },
  {
    scoredCsv: `${ROOT}/data/niche-2026/scored-agencies-B.csv`,
    finalCsv:  `${SEG_DIR}/CC-List-SpecialistAgencies-B.csv`,
    label:     'agencies-B',
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Run a pool of `concurrency` workers over `items`. Each worker pulls the next
 * index from a shared atomic counter, calls `handler`, and loops until the
 * queue is empty. Order of completion is not preserved.
 */
async function runPool<T>(
  items: T[],
  concurrency: number,
  handler: (item: T, idx: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const total = items.length;
  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= total) return;
      try {
        await handler(items[i], i);
      } catch (err) {
        // Handlers are expected to catch their own errors. If one escapes
        // here, log and continue — the pool keeps working.
        console.error(`  [pool-err] item ${i}: ${(err as Error).message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

// ---- Minimal CSV parser (handles quoted fields with commas and double-quotes) ----

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else { cur += c; }
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"') { inQuotes = true; }
      else { cur += c; }
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const r: Record<string, string> = {};
    headers.forEach((h, j) => { r[h] = cells[j] ?? ''; });
    rows.push(r);
  }
  return { headers, rows };
}

function escapeCsv(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowToCsvLine(row: Record<string, string>, columns: string[]): string {
  return columns.map(c => escapeCsv(row[c])).join(',');
}

// ---- Helpers ----

function readDotEnv(path: string): Record<string, string> {
  // Load .env.prod into process.env so getCredits/searchPeople can see AI_ARK_API
  const text = readFileSync(path, 'utf8');
  const env: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    env[k] = v;
    process.env[k] = v;
  }
  return env;
}

function existingDedupeSet(skipPaths: Set<string>): Set<string> {
  const seen = new Set<string>();
  // Use glob-style match against /segmented-lists/CC-List-*.csv
  const fs = require('node:fs') as typeof import('node:fs');
  const dir = fs.readdirSync(SEG_DIR);
  for (const name of dir) {
    if (!name.startsWith('CC-List-') || !name.endsWith('.csv')) continue;
    const path = `${SEG_DIR}/${name}`;
    if (skipPaths.has(path)) continue;
    try {
      const { rows } = parseCsv(readFileSync(path, 'utf8'));
      for (const r of rows) {
        const e = (r.email || '').trim().toLowerCase();
        if (e) seen.add(e);
      }
    } catch (err) {
      console.error(`  [warn] could not read ${path}: ${(err as Error).message}`);
    }
  }
  return seen;
}

function alreadyProcessedIds(finalCsv: string): { ids: Set<string>; columns: string[] | null } {
  if (!existsSync(finalCsv)) return { ids: new Set(), columns: null };
  try {
    const { headers, rows } = parseCsv(readFileSync(finalCsv, 'utf8'));
    const ids = new Set<string>();
    for (const r of rows) {
      const pid = (r.aiark_person_id || '').trim();
      if (pid) ids.add(pid);
    }
    return { ids, columns: headers };
  } catch (err) {
    console.error(`  [warn] could not parse existing ${finalCsv}: ${(err as Error).message}`);
    return { ids: new Set(), columns: null };
  }
}

interface JobStats {
  attempted: number;
  found: number;
  missed: number;
  errored: number;
  duped: number;
  written: number;
  skippedResume: number;
}

async function processJob(job: Job, dedupeSet: Set<string>): Promise<JobStats> {
  console.log(`\n--- ${job.label} ---`);
  const { rows: scored } = parseCsv(readFileSync(job.scoredCsv, 'utf8'));
  console.log(`  scored: ${scored.length} rows`);

  const { ids: processedIds, columns: existingCols } = alreadyProcessedIds(job.finalCsv);
  if (processedIds.size > 0) {
    console.log(`  resume: ${processedIds.size} rows already in ${job.finalCsv.split('/').pop()} — skipping`);
  }

  // Output column layout: existing CSV columns if resuming, else scored columns + email fields
  const scoredCols = scored.length > 0 ? Object.keys(scored[0]) : [];
  const emailCols = ['email', 'email_status', 'email_substatus', 'email_domain_type'];
  const outCols = existingCols ?? [...scoredCols, ...emailCols];

  const fresh = processedIds.size === 0;
  if (fresh) {
    writeFileSync(job.finalCsv, outCols.join(',') + '\n');
  }

  const stats: JobStats = {
    attempted: 0, found: 0, missed: 0, errored: 0,
    duped: 0, written: 0, skippedResume: 0,
  };

  // Single-threaded JS means appendFileSync + Set ops + counter++ are atomic.
  // No mutex needed for the shared stats/dedupe state.
  const start = Date.now();
  let completed = 0;

  await runPool(scored, CONCURRENCY, async (row, idx) => {
    const pid = (row.aiark_person_id || '').trim();
    if (!pid) { stats.errored++; completed++; return; }
    if (processedIds.has(pid)) { stats.skippedResume++; completed++; return; }

    let result;
    try {
      result = await exportPersonSingle({ id: pid });
    } catch (err) {
      stats.errored++;
      console.error(`  [err] ${pid}: ${(err as Error).message}`);
      completed++;
      return;
    }
    stats.attempted++;

    if (!result.found) {
      stats.missed++;
    } else {
      const email = (result.email || '').trim().toLowerCase();
      if (!email) {
        stats.missed++;
      } else if (dedupeSet.has(email)) {
        stats.duped++;
      } else {
        stats.found++;
        dedupeSet.add(email);
        const merged: Record<string, string> = {
          ...row,
          email,
          email_status: result.emailStatus ?? '',
          email_substatus: result.emailSubStatus ?? '',
          email_domain_type: result.emailDomainType ?? '',
        };
        appendFileSync(job.finalCsv, rowToCsvLine(merged, outCols) + '\n');
        stats.written++;
      }
    }

    completed++;
    if (completed % 50 === 0) {
      const elapsed = (Date.now() - start) / 1000;
      const rate = completed / elapsed;
      console.log(
        `  [${job.label}] ${completed}/${scored.length} ` +
        `found=${stats.found} missed=${stats.missed} dupe=${stats.duped} err=${stats.errored} ` +
        `| ${rate.toFixed(1)}/s`
      );
    }
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(0);
  console.log(`  done in ${elapsed}s — ${JSON.stringify(stats)}`);
  return stats;
}

async function main() {
  readDotEnv(`${ROOT}/.env.prod`);
  process.chdir(ROOT);

  const creditsBefore = (await getCredits()).total;
  // Count records that still need processing: scored total minus already-
  // exported (via the alreadyProcessedIds set per output file). This avoids
  // the pre-flight aborting on resume runs that look big-scoped but mostly
  // re-iterate already-paid-for IDs.
  let scopedTotal = 0;
  let remainingTotal = 0;
  for (const j of JOBS) {
    if (!existsSync(j.scoredCsv)) continue;
    const { rows } = parseCsv(readFileSync(j.scoredCsv, 'utf8'));
    scopedTotal += rows.length;
    const { ids: processed } = alreadyProcessedIds(j.finalCsv);
    for (const r of rows) {
      const pid = (r.aiark_person_id || '').trim();
      if (pid && !processed.has(pid)) remainingTotal++;
    }
  }

  // Expected-spend forecast uses observed find rate from past runs (~75%
  // for the expansion-tier cohort) × observed cr/find (~1.02). Worst-case
  // (every attempt finds, every find costs 1cr) is also shown but doesn't
  // gate the run — most attempts cost nothing (404 misses are free).
  const expectedActual = Math.ceil(remainingTotal * 0.75 * 1.02);
  console.log('\n=== PRE-FLIGHT ===');
  console.log(`Credit balance:        ${creditsBefore.toFixed(1)}`);
  console.log(`Scored records total:  ${scopedTotal}`);
  console.log(`Remaining to attempt:  ${remainingTotal} (after resume-skip)`);
  console.log(`Worst-case spend:      ${remainingTotal}cr (every attempt finds)`);
  console.log(`Expected actual:       ~${expectedActual}cr (75% find × 1.02cr)`);
  if (expectedActual > creditsBefore * 0.9) {
    console.error('\nABORT: expected actual spend > 90% of balance. Tighten cohorts or top up.');
    process.exit(2);
  }
  console.log('Proceeding...\n');

  const skipPaths = new Set(JOBS.map(j => j.finalCsv));
  const dedupeSet = existingDedupeSet(skipPaths);
  console.log(`Universe dedupe set: ${dedupeSet.size} existing emails`);

  const allStats: Record<string, JobStats> = {};
  for (const job of JOBS) {
    if (!existsSync(job.scoredCsv)) { console.log(`[skip] ${job.scoredCsv} missing`); continue; }
    allStats[job.label] = await processJob(job, dedupeSet);
  }

  const creditsAfter = (await getCredits()).total;
  console.log('\n=== SUMMARY ===');
  for (const [label, s] of Object.entries(allStats)) {
    console.log(
      `  ${label}: found=${s.found} duped=${s.duped} missed=${s.missed} errored=${s.errored} ` +
      `resumed=${s.skippedResume} → wrote ${s.written}`
    );
  }
  const totalWritten = Object.values(allStats).reduce((sum, s) => sum + s.written, 0);
  console.log(`\n  Total verified emails written: ${totalWritten}`);
  console.log(`  Credits before: ${creditsBefore.toFixed(1)}`);
  console.log(`  Credits after:  ${creditsAfter.toFixed(1)}`);
  console.log(`  Credits spent:  ${(creditsBefore - creditsAfter).toFixed(1)}`);
}

main().catch(err => { console.error(err); process.exit(1); });
