// src/lib/enrichment/research-agents/company-agent.ts
// Agent 1: Deep company intelligence.
// Two parallel Perplexity queries — fundamentals + tech stack/competitors.

import { searchPerplexity } from './perplexity';

export interface CompanyIntel {
  overview: string;
  techStack: string;
  competitors: string[];
  isBtoB: boolean;
  companySize: string;
}

const SYSTEM = 'You are a B2B sales intelligence analyst. Return ONLY factual, specific, verifiable information. Bullet points only. If you cannot find specific information, say "No data found" for that section.';

export async function runCompanyAgent(
  companyName: string,
  domain: string,
): Promise<CompanyIntel> {
  const [overview, techAndComp] = await Promise.all([
    // Query 1: Company fundamentals
    searchPerplexity(
      `Research the company ${companyName} (website: ${domain}). Provide:
- What does the company do? Be specific about their product/service and value prop
- Company size (employee count or range)
- Founded year and HQ location
- Target customer segment (SMB, mid-market, enterprise?)
- Business model (SaaS, services, marketplace, etc.)
- Notable customers, partners, or case studies
- Recent funding rounds with amounts and dates
- Revenue estimate if publicly available

Do NOT speculate. Only include facts you can verify.`,
      { maxTokens: 600, systemPrompt: SYSTEM },
    ),

    // Query 2: Tech stack + competitive landscape
    searchPerplexity(
      `${companyName} (${domain}) technology and competitive analysis:
1. What technology/tools does ${companyName} use? (marketing tools, CRM, analytics, etc.)
2. Who are their direct competitors? List 3-5 with brief comparison
3. What is their market positioning vs competitors? Premium, budget, niche?
4. Are they listed on G2, Capterra, or TrustRadius? What's their rating?
5. Any recent product launches or feature updates?

Factual information only. Bullet points.`,
      { maxTokens: 500, systemPrompt: SYSTEM },
    ),
  ]);

  // Extract structured signals from the raw text
  const combined = `${overview}\n${techAndComp}`.toLowerCase();
  const competitors = extractCompetitors(techAndComp);
  const b2bSignals = ['saas', 'b2b', 'enterprise', 'platform', 'software', 'api', 'consulting', 'agency'];
  const isBtoB = b2bSignals.some((kw) => combined.includes(kw));

  const sizeMatch = combined.match(/(\d[\d,]*)\s*(?:employees?|people|team)/);
  const companySize = sizeMatch ? sizeMatch[1].replace(',', '') : 'unknown';

  return {
    overview,
    techStack: techAndComp,
    competitors,
    isBtoB,
    companySize,
  };
}

function extractCompetitors(text: string): string[] {
  const competitors: string[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    // Look for competitor names in list items
    const match = line.match(/[-•]\s*\*?\*?([A-Z][\w\s.]+?)(?:\*?\*?)?\s*[-–:]/);
    if (match) competitors.push(match[1].trim());
  }
  return competitors.slice(0, 5);
}
