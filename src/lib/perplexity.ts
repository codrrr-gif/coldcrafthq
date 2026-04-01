// ============================================
// Deep Research Pipeline — Multi-Source Intelligence
// ============================================
// Not surface-level fluff. Structured, actionable intelligence
// that the AI can actually USE to write personalized replies.

export interface ResearchResult {
  company_overview: string;
  pain_signals: string;
  opportunity_signals: string;
  connection_points: string;
  raw_research: string;
}

async function queryPerplexity(query: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return '';

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are a B2B sales intelligence analyst. Return ONLY factual, specific, verifiable information. No fluff, no speculation, no generic statements. If you cannot find specific information, say "No data found" — do NOT make things up. Bullet points only.',
        },
        { role: 'user', content: query },
      ],
      max_tokens: 600,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const { trackServiceFailure } = await import('@/lib/slack');
    trackServiceFailure('Perplexity', new Error(`${res.status} ${res.statusText}`)).catch(() => {});
    return '';
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function researchLead(
  leadName: string | null,
  leadEmail: string,
  leadCompany: string | null
): Promise<ResearchResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return {
      company_overview: 'Perplexity API key not configured.',
      pain_signals: '',
      opportunity_signals: '',
      connection_points: '',
      raw_research: '',
    };
  }

  const domain = leadEmail.split('@')[1];
  const companyHint = leadCompany || domain;

  // Run 3 research queries in parallel — each targets different intelligence
  const [companyIntel, painAndOpportunity, personIntel] = await Promise.all([
    // Query 1: Company fundamentals
    queryPerplexity(
      `Research ${companyHint} (website: ${domain}). I need SPECIFIC facts only:
- What does the company do? (1-2 sentences, be specific about their product/service)
- Company size (employees, if available)
- Industry and target market
- Founded when? HQ location?
- Notable clients or partnerships
- Tech stack if known (what tools/platforms do they use?)
- Recent funding rounds or revenue milestones

Be concise. Bullet points. Only include facts you can verify.`
    ),

    // Query 2: Pain signals and opportunities
    queryPerplexity(
      `Find recent news and signals about ${companyHint} (${domain}) from the last 6 months:

PAIN SIGNALS (things that suggest they need help):
- Any layoffs or restructuring?
- Leadership changes (new CEO, VP Sales, CMO)?
- Negative reviews on G2, Glassdoor, Trustpilot?
- Lost customers or market share?
- Hiring for sales/growth roles? (this means they're investing in growth)

OPPORTUNITY SIGNALS (things that suggest they're growing):
- New product launches or expansions?
- Funding announcements?
- Partnerships or acquisitions?
- Awards or press coverage?
- Job postings for sales, marketing, or growth roles?
- Expansion to new markets?

Only report REAL findings. If nothing found, say "No recent signals found."`,
    ),

    // Query 3: Person intelligence (only if we have a name)
    leadName
      ? queryPerplexity(
          `Find information about ${leadName} at ${companyHint}:
- Their exact role/title at the company
- How long they've been there
- Previous companies or roles
- Any LinkedIn posts, articles, or talks they've given recently
- Any mutual connections or shared interests relevant to B2B sales outreach

Only return verified information. If nothing found, say "No personal data found."`,
        )
      : Promise.resolve(''),
  ]);

  // Synthesize: Connect research to our offer
  const synthesis = synthesizeForOffer(companyIntel, painAndOpportunity, personIntel, companyHint);

  return {
    company_overview: companyIntel || 'No company data found.',
    pain_signals: extractSection(painAndOpportunity, 'PAIN') || 'No pain signals detected.',
    opportunity_signals: extractSection(painAndOpportunity, 'OPPORTUNITY') || 'No opportunity signals detected.',
    connection_points: synthesis,
    raw_research: [companyIntel, painAndOpportunity, personIntel].filter(Boolean).join('\n\n---\n\n'),
  };
}

function extractSection(text: string, keyword: string): string {
  const lines = text.split('\n');
  const startIdx = lines.findIndex((l) => l.toUpperCase().includes(keyword));
  if (startIdx === -1) return text;

  const nextSectionIdx = lines.findIndex(
    (l, i) => i > startIdx && /^[A-Z]{2,}/.test(l.trim()) && !l.toUpperCase().includes(keyword)
  );

  return lines
    .slice(startIdx, nextSectionIdx === -1 ? undefined : nextSectionIdx)
    .join('\n')
    .trim();
}

function synthesizeForOffer(
  companyIntel: string,
  signals: string,
  personIntel: string,
  companyName: string
): string {
  const points: string[] = [];

  // Check for growth signals that connect to our offer
  const growthKeywords = ['hiring', 'fundrais', 'funding', 'expand', 'growth', 'launch', 'new market', 'series'];
  const hasGrowthSignal = growthKeywords.some((kw) =>
    (companyIntel + signals).toLowerCase().includes(kw)
  );
  if (hasGrowthSignal) {
    points.push(`${companyName} shows growth signals — they may be scaling outbound to match.`);
  }

  // Check for sales hiring (strongest signal)
  const salesHiring = ['sales', 'sdr', 'bdr', 'account executive', 'business development'].some((kw) =>
    (companyIntel + signals).toLowerCase().includes(kw)
  );
  if (salesHiring) {
    points.push(`They appear to be investing in sales/growth — outbound infrastructure is directly relevant.`);
  }

  // Check for agency/tool mentions
  const agencyMentions = ['agency', 'apollo', 'outreach', 'salesloft', 'instantly', 'lemlist'].some((kw) =>
    (companyIntel + signals).toLowerCase().includes(kw)
  );
  if (agencyMentions) {
    points.push(`They may already use outbound tools/agencies — position as upgrade, not introduction.`);
  }

  // B2B indicators
  const b2bSignals = ['saas', 'b2b', 'enterprise', 'platform', 'software', 'consulting', 'agency', 'services'].some(
    (kw) => (companyIntel + signals).toLowerCase().includes(kw)
  );
  if (b2bSignals) {
    points.push(`Confirmed B2B company — squarely in our ICP.`);
  }

  if (!points.length) {
    points.push(`Limited public intelligence available. Use their reply content for personalization instead.`);
  }

  return points.join('\n');
}
