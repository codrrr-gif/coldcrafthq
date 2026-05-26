#!/usr/bin/env tsx
// Multi-command CLI wrapping the AI Ark TS client.
// Usage examples:
//   tsx ai-ark-cli.ts credits
//   tsx ai-ark-cli.ts search-people --params=path/to/params.json --out=path/to/metadata.csv
//   tsx ai-ark-cli.ts export-people --params=path/to/params.json --webhook=https://noop.example.com/wh
//   tsx ai-ark-cli.ts poll-export --track-id=<trackId>
//   tsx ai-ark-cli.ts fetch-export --track-id=<trackId> --out=path/to/verified.csv
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import {
  getCredits, searchPeople, exportPeopleWithEmail, exportPersonSingle,
  getExportStatistics, getExportInquiries,
  type AIArkPersonRecord,
  type AIArkExportInquiryRecord,
} from '../../src/lib/sources/ai-ark';

function arg(name: string, required = true): string | undefined {
  // Accept both `--name=value` and bare `--name` (flag form, returns "true").
  const pair = process.argv.find(a => a.startsWith(`--${name}=`));
  if (pair) return pair.split('=', 2)[1];
  const bareFlag = process.argv.includes(`--${name}`);
  if (bareFlag) return 'true';
  if (required) throw new Error(`Missing --${name}=`);
  return undefined;
}

function escape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Flatten a person record into a single CSV row with stable columns.
function personRow(r: AIArkPersonRecord): Record<string, string> {
  const cur = r.position_groups?.[0]?.company;
  const curPos = r.position_groups?.[0]?.profile_positions?.[0];
  return {
    aiark_person_id: String(r.id ?? ''),
    first_name: String(r.profile?.first_name ?? ''),
    last_name: String(r.profile?.last_name ?? ''),
    full_name: String(r.profile?.full_name ?? ''),
    title: String(curPos?.title ?? r.profile?.title ?? ''),
    headline: String(r.profile?.headline ?? ''),
    linkedin_url: String(r.link?.linkedin ?? ''),
    company_name: String(cur?.name ?? ''),
    aiark_company_id: String(cur?.id ?? ''),
    company_linkedin_url: String(cur?.url ?? ''),
    company_headcount_start: String(cur?.employees?.start ?? ''),
    company_headcount_end: String(cur?.employees?.end ?? ''),
    company_industry: String(r.industry ?? ''),
    person_country: String(r.location?.country ?? ''),
    person_state: String(r.location?.state ?? ''),
    person_city: String(r.location?.city ?? ''),
    seniority: String(r.department?.seniority ?? ''),
  };
}

function rowsToCsv(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const header = cols.join(',');
  const body = rows.map(r => cols.map(c => escape(r[c])).join(',')).join('\n');
  return header + '\n' + body + '\n';
}

async function cmdCredits() {
  const c = await getCredits();
  console.log(JSON.stringify(c));
}

async function cmdSearchPeople() {
  const paramsPath = arg('params')!;
  const outPath = arg('out')!;
  const appendMode = arg('append', false) !== undefined;
  const params = JSON.parse(readFileSync(paramsPath, 'utf8'));

  // CRITICAL: stream pages to disk via onPage callback. AI Ark charges
  // 0.5cr per record; a mid-pagination ECONNRESET must NOT lose
  // already-paid-for pages. Write header on first page (unless --append),
  // then append each subsequent page.
  //
  // --append: skip the header write and append to the existing file. Use this
  // to resume a partial pull. Pair with `params.page = <next-page>` to skip
  // already-fetched pages, and tighten `maxResults` to the REMAINING records.
  let columns: string[] | null = null;
  let totalWritten = 0;
  let pagesWritten = 0;
  let headerWritten = appendMode;  // in append mode, header already exists

  const onPage = (batch: AIArkPersonRecord[], pageNum: number): void => {
    if (batch.length === 0) return;
    const rows = batch.map(personRow);
    if (columns === null) {
      columns = Object.keys(rows[0]);
      if (!headerWritten) {
        writeFileSync(outPath, columns.join(',') + '\n');
        headerWritten = true;
      }
    }
    const body = rows.map(r => columns!.map(c => escape(r[c])).join(',')).join('\n') + '\n';
    appendFileSync(outPath, body);
    totalWritten += rows.length;
    pagesWritten += 1;
    console.error(JSON.stringify({
      event: 'page', page: pageNum, wroteThisPage: rows.length, totalWritten,
    }));
  };

  try {
    const result = await searchPeople(params, onPage);
    console.error(JSON.stringify({
      event: 'done', wrote: totalWritten, pagesWritten,
      totalElements: result.totalElements, trackId: result.trackId, out: outPath,
    }));
    if (result.trackId) console.log(result.trackId);
  } catch (err) {
    console.error(JSON.stringify({
      event: 'aborted', wrote: totalWritten, pagesWritten,
      out: outPath, error: err instanceof Error ? err.message : String(err),
    }));
    throw err;
  }
}

async function cmdExportPeople() {
  const paramsPath = arg('params')!;
  const webhook = arg('webhook')!;
  const params = JSON.parse(readFileSync(paramsPath, 'utf8'));
  const trackId = await exportPeopleWithEmail(params, webhook);
  console.log(trackId);
}

async function cmdPollExport() {
  const trackId = arg('track-id')!;
  const stats = await getExportStatistics(trackId);
  console.log(JSON.stringify(stats));
}

// Flatten an inquiry record into a row joining input + first VALID output.
function inquiryRow(i: AIArkExportInquiryRecord): Record<string, string> | null {
  const valid = i.output.find(o => o.status === 'VALID');
  if (!valid) return null;
  return {
    refId: String(i.refId ?? ''),
    state: String(i.state ?? ''),
    email: String(valid.address ?? ''),
    email_status: String(valid.status ?? ''),
    email_substatus: String(valid.subStatus ?? ''),
    email_domain_type: String(valid.domainType ?? ''),
    first_name: String(i.input.firstname ?? ''),
    last_name: String(i.input.lastname ?? ''),
    company_domain: String(i.input.domain ?? ''),
  };
}

// Single-person email find by AI Ark person id (or LinkedIn URL).
// Output: one JSON line on stdout — { found: bool, email?, status?, ... }
async function cmdExportSingle() {
  const id = arg('id', false);
  const url = arg('url', false);
  if (!id && !url) throw new Error('export-single requires --id=<uuid> or --url=<linkedin>');
  const result = await exportPersonSingle(id ? { id } : { url });
  console.log(JSON.stringify(result));
}

async function cmdFetchExport() {
  const trackId = arg('track-id')!;
  const outPath = arg('out')!;
  const all: Array<Record<string, string>> = [];
  let page = 0;
  while (true) {
    const data = await getExportInquiries(trackId, page, 100);
    for (const item of data.content ?? []) {
      const r = inquiryRow(item);
      if (r) all.push(r);
    }
    if (page + 1 >= (data.totalPages ?? 1)) break;
    page += 1;
  }
  writeFileSync(outPath, rowsToCsv(all));
  console.log(JSON.stringify({ wrote: all.length, out: outPath }));
}

async function main() {
  const cmd = process.argv[2];
  switch (cmd) {
    case 'credits':        return cmdCredits();
    case 'search-people':  return cmdSearchPeople();
    case 'export-people':  return cmdExportPeople();
    case 'export-single':  return cmdExportSingle();
    case 'poll-export':    return cmdPollExport();
    case 'fetch-export':   return cmdFetchExport();
    default:
      console.error(`Unknown command: ${cmd}`);
      console.error('Usage: ai-ark-cli.ts <credits|search-people|export-people|export-single|poll-export|fetch-export> [--flags...]');
      process.exit(2);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
