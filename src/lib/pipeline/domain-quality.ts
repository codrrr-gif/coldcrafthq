// src/lib/pipeline/domain-quality.ts
// Filters out domains that waste pipeline capacity.

// Job boards, URL shorteners, and aggregator sites — never actual companies
const BLOCKED_DOMAINS = new Set([
  // Job boards
  'linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com',
  'monster.com', 'careerbuilder.com', 'dice.com', 'lever.co',
  'greenhouse.io', 'jobs.ashbyhq', 'workday.com', 'jobgether.com',
  'zobjobs.com', 'wellfound.com', 'angel.co', 'otta.com',
  // URL shorteners / aggregators
  'dlvr.it', 'bit.ly', 't.co', 'buff.ly', 'ow.ly', 'tinyurl.com',
  // News / media
  'techcrunch.com', 'bloomberg.com', 'reuters.com', 'forbes.com',
  'businessinsider.com', 'cnbc.com', 'wsj.com', 'nytimes.com',
]);

// Enterprise giants with 10k+ employees — cold email doesn't work at this scale
const ENTERPRISE_DOMAINS = new Set([
  'sap.com', 'oracle.com', 'ibm.com', 'microsoft.com', 'google.com',
  'amazon.com', 'apple.com', 'meta.com', 'salesforce.com', 'adobe.com',
  'cisco.com', 'intel.com', 'dell.com', 'hp.com', 'accenture.com',
  'deloitte.com', 'pwc.com', 'ey.com', 'kpmg.com', 'mckinsey.com',
  'roberthalf.com', 'nttdata.com', 'mckesson.com', 'hyatt.com',
  'marriott.com', 'hilton.com', 'walmart.com', 'target.com',
  'jpmorgan.com', 'goldmansachs.com', 'morganstanley.com',
]);

export function isBlockedDomain(domain: string): boolean {
  if (!domain) return true;

  const d = domain.toLowerCase().trim();

  // Direct match
  if (BLOCKED_DOMAINS.has(d) || ENTERPRISE_DOMAINS.has(d)) return true;

  // Invalid domain format
  if (!d.includes('.') || d.length < 4 || d.length > 60) return true;

  // Contains spaces or AI paragraph remnants
  if (d.includes(' ') || d.includes('\n')) return true;

  return false;
}
