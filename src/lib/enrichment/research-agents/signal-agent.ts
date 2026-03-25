// src/lib/enrichment/research-agents/signal-agent.ts
// Agent 2: Signal-specific context and implications.
// Tailors the Perplexity query deeply to the signal type.

import { searchPerplexity } from './perplexity';
import type { SignalType } from '@/lib/gtm/types';

export interface SignalIntel {
  context: string;
  implications: string[];
  urgency: 'high' | 'medium' | 'low';
}

const SYSTEM = 'You are a B2B sales strategist who specializes in reading buying signals. Analyze the following signal and its implications for outbound sales. Be specific, not generic.';

// Each signal type gets a deeply tailored research query
const SIGNAL_QUERIES: Record<SignalType, (company: string, domain: string, summary: string) => string> = {
  funding: (company, _domain, summary) =>
    `${company} recently raised funding: "${summary}".

Research and answer:
1. What specific growth plans did they announce alongside this funding? (hiring targets, market expansion, product roadmap)
2. What roles are they hiring for RIGHT NOW? (check their careers page, LinkedIn jobs)
3. What operational challenges do companies at this stage typically face with outbound sales?
4. Who led the round? What does the investor profile suggest about their strategy?
5. What is the typical 6-12 month playbook after this type of funding round?

Be specific to THIS company and THIS round. No generic advice.`,

  job_posting: (company, _domain, summary) =>
    `${company} posted a job: "${summary}".

Research and answer:
1. What does this specific role tell us about their growth stage? Are they building a new team or backfilling?
2. What other roles are they hiring for right now? What does the overall hiring pattern signal?
3. What tools/tech does the job posting mention? (CRM, outbound tools, marketing automation)
4. What pain points does this role typically solve? What was likely broken before this hire?
5. Is the hiring manager likely to be evaluating new vendors for this role?

Focus on actionable sales intelligence, not generic observations.`,

  leadership_change: (company, _domain, summary) =>
    `${company} had a leadership change: "${summary}".

Research and answer:
1. What is this person's track record? What did they build at their previous company?
2. What tools/vendors did they use at their previous company? (CRM, outbound, marketing)
3. New leaders typically evaluate vendors in the first 90 days. What categories will this person likely review?
4. What was the company doing before this hire? Is this a new direction or continuation?
5. What industry connections does this person bring?

Focus on what this change means for vendor evaluation and buying cycles.`,

  news: (company, _domain, summary) =>
    `${company} recent news: "${summary}".

Research and answer:
1. What does this news signal about their current business trajectory?
2. How does this affect their operational needs in the next 3-6 months?
3. Are they expanding, consolidating, or pivoting? What evidence supports this?
4. What challenges or opportunities does this create for their sales/marketing team?

Be specific to this news event, not generic.`,

  intent: (company, _domain, summary) =>
    `${company} shows buying intent: "${summary}".

Research and answer:
1. What category of solution are they actively evaluating?
2. What competitors in this space are they likely comparing?
3. What stage of the buying process does this intent signal suggest? (awareness, consideration, decision)
4. What pain points are driving this research?
5. What would make them choose one vendor over another?`,

  tech_stack: (company, domain, summary) =>
    `${company} (${domain}) tech stack signal: "${summary}".

Research:
1. What is their full known tech stack? (BuiltWith, Wappalyzer, G2 Stack data)
2. Are they using competitor products to what we might offer?
3. Are there integration pain points in their current stack?
4. What gaps exist in their current tooling?`,

  competitor_review: (company, _domain, summary) =>
    `Someone from ${company} left a review: "${summary}".

Research:
1. What specific complaints did they mention?
2. What features or capabilities are they missing?
3. What alternatives are they likely evaluating?
4. What is the switching cost from their current vendor?
5. What would a winning pitch look like for someone actively dissatisfied?`,

  job_change: (company, _domain, summary) =>
    `Job change at ${company}: "${summary}".

Research:
1. What was this person's role and impact at their previous company?
2. What tools/vendors do people in this role typically evaluate in their first 90 days?
3. What budget authority does this role typically have?
4. What is the new company's current stack in this person's domain?
5. How does their previous company's approach differ from the new company's?`,
};

export async function runSignalAgent(
  companyName: string,
  domain: string,
  signalType: SignalType,
  signalSummary: string,
): Promise<SignalIntel> {
  const queryBuilder = SIGNAL_QUERIES[signalType];
  const query = queryBuilder(companyName, domain, signalSummary);

  const context = await searchPerplexity(query, {
    maxTokens: 600,
    systemPrompt: SYSTEM,
  });

  // Determine urgency based on signal type and recency
  const highUrgency: SignalType[] = ['funding', 'leadership_change', 'job_change', 'competitor_review'];
  const urgency = highUrgency.includes(signalType) ? 'high' : 'medium';

  // Extract key implications as bullet points
  const implications = context
    .split('\n')
    .filter((line) => line.trim().match(/^[-•\d]/))
    .map((line) => line.replace(/^[-•\d.)\s]+/, '').trim())
    .filter((line) => line.length > 20)
    .slice(0, 5);

  return { context, implications, urgency };
}
