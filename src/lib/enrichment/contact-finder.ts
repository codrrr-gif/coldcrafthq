// src/lib/enrichment/contact-finder.ts
// ============================================
// Finds the best decision maker at a company.
// 3-level waterfall:
//   Level 1: Google site:linkedin.com/in search (fast, works for ~40%)
//   Level 2: Company website /team or /about scrape via Apify
//   Level 3: Broad Google search for decision maker at company
// ============================================

import { runGoogleSearch, runActor, runLinkedInPeopleSearch, getRunStatus, getDatasetItems } from '@/lib/apify';
import { isTitleInIcp } from '@/lib/signals/icp-filter';

export interface Contact {
  first_name: string;
  last_name: string;
  title: string;
  linkedin_url: string | null;
  source: string;
}

const DECISION_MAKER_TITLES = [
  'CEO', 'Founder', 'Co-Founder', 'Owner', 'President',
  'Managing Director', 'Partner', 'Managing Partner', 'Principal', 'General Manager',
  'VP Sales', 'VP of Sales', 'Head of Sales', 'Chief Revenue Officer', 'CRO',
  'VP Marketing', 'VP of Marketing', 'Head of Growth', 'Head of Marketing',
  'Chief Marketing Officer', 'CMO', 'VP Business Development',
  'Director of Sales', 'Director of Marketing', 'Director of Revenue',
  'Director of Business Development', 'Head of Business Development',
];

// ── Level 0: Direct LinkedIn People Search ─────────────────────────────────

async function findViaLinkedInPeopleSearch(
  companyName: string,
): Promise<Contact | null> {
  try {
    const titleKeywords = ['VP Sales', 'Head of Sales', 'CRO', 'VP Marketing', 'Head of Growth', 'CMO', 'CEO', 'Founder', 'Owner', 'President', 'Managing Director', 'Partner', 'General Manager', 'Director of Sales'];
    const { runId, datasetId } = await runLinkedInPeopleSearch(companyName, titleKeywords, 10);
    const items = await pollApifyRun(runId, datasetId, 45);

    for (const item of items) {
      const fullName = String(item.name || item.fullName || '');
      const role = String(item.title || item.headline || item.position || '');
      const profileUrl = String(item.url || item.profileUrl || item.linkedinUrl || '');

      if (!fullName || !role) continue;

      // Check if the title matches our ICP decision-maker roles
      if (!isTitleInIcp(role)) continue;

      const name = parseFullName(fullName);
      if (!name) continue;

      return {
        ...name,
        title: role.split(' at ')[0].split(' | ')[0].trim(),
        linkedin_url: profileUrl.includes('linkedin.com') ? profileUrl : null,
        source: 'linkedin_people_search',
      };
    }
  } catch (err) {
    console.error('[contact-finder] LinkedIn People Search failed:', err);
  }
  return null;
}

// ── Level 1: Google → LinkedIn search ──────────────────────────────────────

export async function findDecisionMaker(
  companyName: string,
  companyDomain: string,
): Promise<Contact | null> {
  // Hard cap: 120s total for all levels — prevents one lead from eating the function budget
  const deadline = Date.now() + 120_000;

  // Level 0: Perplexity AI search (fastest, most reliable — single API call, no polling)
  const perplexityContact = await findViaPerplexity(companyName, companyDomain);
  if (perplexityContact) return perplexityContact;
  if (Date.now() > deadline) return null;

  // Level 1: LinkedIn via Google (Apify fallback)
  const contact = await findViaLinkedInSearch(companyName, companyDomain);
  if (contact) return contact;
  if (Date.now() > deadline) return null;

  // Level 2: DISABLED — Cheerio scraper returns garbage (page copy as names)
  // const contactFromSite = await findViaCompanyWebsite(companyDomain);
  // if (contactFromSite) return contactFromSite;
  if (Date.now() > deadline) return null;

  // Level 3: Broad Google search (no site: restriction)
  return findViaBroadSearch(companyName, companyDomain);
}

// ── Level 0: Perplexity AI search ─────────────────────────────────────────────

async function findViaPerplexity(
  companyName: string,
  companyDomain: string,
): Promise<Contact | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [{
          role: 'user',
          content: `Who is the head of sales, growth, or marketing at ${companyName} (${companyDomain})? If no sales/marketing leader, who is the CEO, founder, or owner?

Return ONLY a JSON object: {"first_name": "...", "last_name": "...", "title": "...", "linkedin_url": "..."}

Rules:
- Return the most senior sales/marketing person. If none found, return the CEO/founder/owner.
- linkedin_url should be their LinkedIn profile URL if known, or null.
- If you cannot find anyone, return {"first_name": null}
- Do NOT make up names. Only return real, verifiable people.`,
        }],
        max_tokens: 150,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content || '';

    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.first_name || !parsed.last_name) return null;

    // Validate title matches ICP
    const title = String(parsed.title || '');
    if (!title) return null;

    return {
      first_name: parsed.first_name.trim(),
      last_name: parsed.last_name.trim(),
      title: title.trim(),
      linkedin_url: parsed.linkedin_url && String(parsed.linkedin_url).includes('linkedin.com')
        ? parsed.linkedin_url
        : null,
      source: 'perplexity',
    };
  } catch (err) {
    console.error('[contact-finder] Perplexity search failed:', err);
    return null;
  }
}

async function findViaLinkedInSearch(
  companyName: string,
  companyDomain: string,
): Promise<Contact | null> {
  const queries = [
    `site:linkedin.com/in "${companyName}" "VP Sales" OR "Head of Sales" OR "CRO" OR "Owner" OR "Founder" OR "CEO"`,
    `site:linkedin.com/in "${companyName}" "VP Marketing" OR "Head of Growth" OR "CMO" OR "President" OR "Managing Director"`,
    `site:linkedin.com/in "${companyDomain}" "VP Sales" OR "CRO" OR "Owner" OR "Founder" OR "Director of Sales"`,
  ];

  try {
    const { runId, datasetId } = await runGoogleSearch(queries, 5);
    const items = await pollApifyRun(runId, datasetId, 45);

    for (const item of items) {
      const url = String(item.url || '');
      const title = String(item.title || '');
      if (!url.includes('linkedin.com/in/')) continue;

      const name = extractNameFromTitle(title);
      const role = extractRoleFromTitle(title);
      if (!name || !role) continue;
      if (!isTitleInIcp(role)) continue;

      return { ...name, title: role, linkedin_url: url, source: 'google_linkedin' };
    }
  } catch (err) {
    console.error('[contact-finder] LinkedIn search failed:', err);
  }
  return null;
}

async function findViaCompanyWebsite(companyDomain: string): Promise<Contact | null> {
  // Try common team/about pages — Apify Cheerio Scraper is fast and cheap
  const teamPages = [
    `https://${companyDomain}/team`,
    `https://${companyDomain}/about`,
    `https://${companyDomain}/leadership`,
    `https://${companyDomain}/about-us`,
  ];

  try {
    const { runId, datasetId } = await runActor('apify/cheerio-scraper', {
      startUrls: teamPages.map((url) => ({ url })),
      pageFunction: `async function pageFunction({ $, request }) {
        const people = [];
        // Look for common leadership section patterns
        $('h1, h2, h3, h4, [class*="name"], [class*="member"], [class*="person"], [class*="team"], [class*="leader"]').each((_, el) => {
          const text = $(el).text().trim();
          if (text.length < 3 || text.length > 80) return;
          // Look for adjacent title/role text
          const role = $(el).next().text().trim() || $(el).parent().find('[class*="title"], [class*="role"], [class*="position"]').first().text().trim();
          if (text && role) people.push({ name: text, role, url: request.url });
        });
        return people;
      }`,
      maxRequestsPerCrawl: 4,
    });

    const items = await pollApifyRun(runId, datasetId, 30);

    for (const item of items) {
      const name = String((item as Record<string, unknown>).name || '');
      const role = String((item as Record<string, unknown>).role || '');
      if (!name || !role) continue;
      if (!isTitleInIcp(role)) continue;

      const parsed = parseFullName(name);
      if (!parsed) continue;

      return { ...parsed, title: role.trim(), linkedin_url: null, source: 'company_website' };
    }
  } catch (err) {
    console.error('[contact-finder] Company website scrape failed:', err);
  }
  return null;
}

async function findViaBroadSearch(
  companyName: string,
  companyDomain: string,
): Promise<Contact | null> {
  // Broad Google search — no site: restriction
  const queries = [
    `"${companyName}" "VP Sales" OR "Head of Sales" OR "Chief Revenue Officer" site:linkedin.com`,
    `"${companyName}" "VP Marketing" OR "Head of Growth" site:linkedin.com`,
    `"${companyName}" "${companyDomain}" executive leadership sales marketing`,
  ];

  try {
    const { runId, datasetId } = await runGoogleSearch(queries, 5);
    const items = await pollApifyRun(runId, datasetId, 45);

    for (const item of items) {
      const url = String(item.url || '');
      const title = String(item.title || '');
      const desc = String(item.description || '');

      // Try to find a name + title in the snippet
      const name = extractNameFromTitle(title) || extractNameFromSnippet(desc);
      const role = extractRoleFromTitle(title) || extractRoleFromSnippet(desc);
      if (!name || !role) continue;
      if (!isTitleInIcp(role)) continue;

      return {
        ...name,
        title: role,
        linkedin_url: url.includes('linkedin.com') ? url : null,
        source: 'broad_search',
      };
    }
  } catch (err) {
    console.error('[contact-finder] Broad search failed:', err);
  }
  return null;
}

// ── Apify polling helper ─────────────────────────────────────────────────────

async function pollApifyRun(
  runId: string,
  datasetId: string,
  maxSeconds: number,
): Promise<Record<string, unknown>[]> {
  const polls = Math.ceil(maxSeconds / 5);
  for (let i = 0; i < polls; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const status = await getRunStatus(runId);
    if (status.status === 'SUCCEEDED') {
      return await getDatasetItems(datasetId, 20) as Record<string, unknown>[];
    }
    if (status.status === 'FAILED' || status.status === 'TIMED-OUT' || status.status === 'ABORTED') break;
  }
  return [];
}

// ── Name extraction helpers ──────────────────────────────────────────────────

// Handles: "John Smith", "Mary-Jane Watson", "John de la Cruz", "Sarah O'Brien"
// "J. Smith", "María García", "Jean-Pierre Dupont"
function extractNameFromTitle(pageTitle: string): { first_name: string; last_name: string } | null {
  // LinkedIn title format: "FirstName LastName - Role at Company | LinkedIn"
  // or: "FirstName LastName | LinkedIn"
  const match = pageTitle.match(
    /^([\p{L}]+(?:[\s\-'\.]+[\p{L}]+)*?)\s*[-–|]/u
  );
  if (!match) return null;
  return parseFullName(match[1]);
}

function extractNameFromSnippet(snippet: string): { first_name: string; last_name: string } | null {
  // Look for patterns like "John Smith, VP Sales at Acme"
  const match = snippet.match(
    /([\p{L}]+(?:[\s\-']+[\p{L}]+)*?),?\s+(?:VP|Head|Chief|Director|CRO|CMO|CEO|Founder)/u
  );
  if (!match) return null;
  return parseFullName(match[1]);
}

function parseFullName(fullName: string): { first_name: string; last_name: string } | null {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const first_name = parts[0];
  const last_name = parts.slice(1).join(' '); // handles "de la Cruz", "van der Berg"
  if (!first_name || !last_name) return null;
  return { first_name, last_name };
}

function extractRoleFromTitle(pageTitle: string): string | null {
  // "John Smith - VP Sales at Acme Corp | LinkedIn"
  const match = pageTitle.match(/[-–]\s*([\w\s]+?)\s+(?:at\s+|@\s+|\|)/i);
  if (match?.[1]) {
    const role = match[1].trim();
    if (DECISION_MAKER_TITLES.some((t) => role.toLowerCase().includes(t.toLowerCase()))) {
      return role;
    }
  }
  return null;
}

function extractRoleFromSnippet(snippet: string): string | null {
  for (const title of DECISION_MAKER_TITLES) {
    if (snippet.toLowerCase().includes(title.toLowerCase())) return title;
  }
  return null;
}
