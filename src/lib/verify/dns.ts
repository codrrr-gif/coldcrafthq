// ============================================
// Layer 2: DNS Verification
// ============================================
// MX record lookup, SPF/DMARC detection, provider identification,
// disposable domain check. Runs on Vercel using Node dns.promises.

import { promises as dns } from 'dns';
import type { DnsResult, MxRecord } from './types';
import { isDisposableDomain } from './disposable-domains';

// Provider identification by MX record patterns
const PROVIDER_PATTERNS: [RegExp, string][] = [
  [/google(mail)?\.com|smtp\.google\.com/i, 'google'],
  [/outlook\.com|hotmail\.com|microsoft\.com/i, 'microsoft'],
  [/yahoodns\.net|yahoo\.com/i, 'yahoo'],
  [/zoho\.(com|eu|in)/i, 'zoho'],
  [/protonmail\.ch|proton\.me/i, 'protonmail'],
  [/mimecast\.(com|co\.za)/i, 'mimecast'],
  [/barracuda(networks)?\.com/i, 'barracuda'],
  [/pphosted\.com|proofpoint\.com/i, 'proofpoint'],
  [/messagelabs\.com|symanteccloud\.com/i, 'symantec'],
  [/secureserver\.net/i, 'godaddy'],
  [/emailsrvr\.com|rackspace\.com/i, 'rackspace'],
  [/ovh\.(net|com)/i, 'ovh'],
  [/mail\.protection\.outlook\.com/i, 'microsoft365'],
  [/registrar-servers\.com/i, 'namecheap'],
  [/icloud\.com|apple\.com/i, 'apple'],
  [/yandex\.(net|ru|com)/i, 'yandex'],
  [/fastmail\.(com|fm)/i, 'fastmail'],
  [/forwardemail\.net/i, 'forwardemail'],
  [/cloudflare\.net/i, 'cloudflare'],
  [/improvmx\.com/i, 'improvmx'],
  [/migadu\.com/i, 'migadu'],
  [/mx\.sendgrid\.net/i, 'sendgrid'],
  [/amazonaws\.com/i, 'aws-ses'],
  [/mailgun\.org/i, 'mailgun'],
  [/postmarkapp\.com/i, 'postmark'],
];

// Known parked/inactive domain MX patterns
const PARKED_PATTERNS = [
  /parkingcrew\.net/i,
  /sedoparking\.com/i,
  /bodis\.com/i,
  /above\.com/i,
  /undeveloped\.com/i,
  /hugedomains\.com/i,
  /dan\.com/i,
  /afternic\.com/i,
];

function identifyProvider(mxRecords: MxRecord[]): string | null {
  for (const mx of mxRecords) {
    for (const [pattern, provider] of PROVIDER_PATTERNS) {
      if (pattern.test(mx.exchange)) return provider;
    }
  }
  return null;
}

function isParkedDomain(mxRecords: MxRecord[]): boolean {
  return mxRecords.some((mx) =>
    PARKED_PATTERNS.some((pattern) => pattern.test(mx.exchange))
  );
}

async function lookupMx(domain: string): Promise<MxRecord[]> {
  try {
    const records = await dns.resolveMx(domain);
    return records
      .map((r) => ({ exchange: r.exchange, priority: r.priority }))
      .sort((a, b) => a.priority - b.priority);
  } catch {
    return [];
  }
}

async function hasSpfRecord(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(domain);
    return records.some((r) =>
      r.join('').toLowerCase().startsWith('v=spf1')
    );
  } catch {
    return false;
  }
}

async function hasDmarcRecord(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`);
    return records.some((r) =>
      r.join('').toLowerCase().startsWith('v=dmarc1')
    );
  } catch {
    return false;
  }
}

export async function verifyDns(domain: string): Promise<DnsResult> {
  // Run all DNS lookups in parallel
  const [mxRecords, spf, dmarc] = await Promise.all([
    lookupMx(domain),
    hasSpfRecord(domain),
    hasDmarcRecord(domain),
  ]);

  const hasMx = mxRecords.length > 0;
  const provider = hasMx ? identifyProvider(mxRecords) : null;
  const isParked = hasMx ? isParkedDomain(mxRecords) : false;
  const disposable = isDisposableDomain(domain);

  // A domain accepts mail if it has MX records and is not parked
  const acceptsMail = hasMx && !isParked;

  return {
    has_mx: hasMx,
    mx_records: mxRecords,
    has_spf: spf,
    has_dmarc: dmarc,
    provider,
    is_disposable: disposable,
    is_parked: isParked,
    accepts_mail: acceptsMail,
  };
}
