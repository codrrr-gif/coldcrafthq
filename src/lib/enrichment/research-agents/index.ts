// src/lib/enrichment/research-agents/index.ts
// Multi-agent research orchestrator.
// Runs 3 specialized agents in parallel, then synthesizes with Claude.

import Anthropic from '@anthropic-ai/sdk';
import type { ResearchResult, SignalType } from '@/lib/gtm/types';
import { runCompanyAgent, type CompanyIntel } from './company-agent';
import { runSignalAgent, type SignalIntel } from './signal-agent';
import { runPersonaAgent, type PersonaIntel } from './persona-agent';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Opener pattern loader (from V7 learning loop) ─────────────────────────

async function getOpenerExamples(signalType: SignalType): Promise<string> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data } = await sb
      .from('opener_patterns')
      .select('pattern_summary, example_opener, signal_score, industry')
      .eq('signal_type', signalType)
      .order('signal_score', { ascending: false, nullsFirst: false })
      .limit(5);

    if (!data?.length) return '';

    const examples = (data as Array<{ pattern_summary: string; example_opener: string; signal_score: number | null; industry: string | null }>)
      .map((p, i) => `${i + 1}. "${p.example_opener}" [Pattern: ${p.pattern_summary}${p.industry ? `, Industry: ${p.industry}` : ''}]`)
      .join('\n');

    return `\n--- PROVEN OPENER PATTERNS (from leads that replied "interested") ---\n${examples}\n---\n`;
  } catch {
    return '';
  }
}

// ── Main orchestrator ──────────────────────────────────────────────────────

export async function researchLead(params: {
  companyName: string;
  domain: string;
  firstName: string;
  lastName: string;
  title: string;
  signalType: SignalType;
  signalSummary: string;
}): Promise<ResearchResult> {
  const { companyName, domain, firstName, lastName, title, signalType, signalSummary } = params;

  // Run all 4 tasks in parallel: 3 research agents + opener pattern loader
  const [companyIntel, signalIntel, personaIntel, openerExamples] = await Promise.all([
    runCompanyAgent(companyName, domain).catch((): CompanyIntel => ({
      overview: '', techStack: '', competitors: [], isBtoB: false, companySize: 'unknown',
    })),
    runSignalAgent(companyName, domain, signalType, signalSummary).catch((): SignalIntel => ({
      context: '', implications: [], urgency: 'medium',
    })),
    runPersonaAgent(firstName, lastName, title, companyName, domain).catch((): PersonaIntel => ({
      profile: '', previousCompanies: [], likelyPriorities: [], communicationStyle: 'unknown',
    })),
    getOpenerExamples(signalType).catch(() => ''),
  ]);

  // Claude synthesizes all intelligence into actionable output
  const synthesis = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `You are writing a cold email opening line for an outbound sales campaign. It must sound like a human who genuinely follows the industry, not an AI that scraped a database.

=== THE SIGNAL ===
Type: ${signalType}
Summary: ${signalSummary}
Urgency: ${signalIntel.urgency}

=== COMPANY INTELLIGENCE ===
${companyIntel.overview}

Tech Stack & Competitors:
${companyIntel.techStack}
${companyIntel.competitors.length ? `Known competitors: ${companyIntel.competitors.join(', ')}` : ''}
Company size: ${companyIntel.companySize} | B2B: ${companyIntel.isBtoB ? 'Yes' : 'Unclear'}

=== SIGNAL ANALYSIS ===
${signalIntel.context}
${signalIntel.implications.length ? `Key implications:\n${signalIntel.implications.map((i) => `- ${i}`).join('\n')}` : ''}

=== CONTACT PROFILE ===
${firstName} ${lastName}, ${title}
${personaIntel.profile}
${personaIntel.previousCompanies.length ? `Previous: ${personaIntel.previousCompanies.join(', ')}` : ''}
Likely priorities: ${personaIntel.likelyPriorities.join(', ')}
Communication style: ${personaIntel.communicationStyle}
${openerExamples}
=== YOUR TASK ===
Write the following as JSON:

1. "opener" — A 1-sentence personalized cold email opening line that:
   - References the SPECIFIC signal (funding amount, exact role they're hiring for, the person's name in the news, etc.)
   - Connects the signal to a pain point or opportunity they're likely facing RIGHT NOW
   - Sounds like you follow the space and noticed this organically
   - Matches their communication style (${personaIntel.communicationStyle === 'casual' ? 'keep it conversational' : personaIntel.communicationStyle === 'formal' ? 'keep it professional' : 'default to professional but warm'})

2. "pain_points" — Array of 3 specific pain points this company likely has RIGHT NOW given:
   - The signal (${signalType}: ${signalSummary})
   - Their company stage (${companyIntel.companySize} employees)
   - Their current tech stack and competitors
   Each pain point should be specific enough that the reader thinks "how did they know that?"

3. "opportunity_signals" — Array of 3 reasons they'd be receptive to outreach RIGHT NOW
   Be specific: not "they're growing" but "they just raised $X and are hiring Y roles, suggesting they need Z"

4. "summary" — A 2-sentence research summary that a sales rep could scan in 5 seconds

RULES:
- No em dashes. No "I noticed". No "I came across". No "Congratulations on".
- No generic pain points like "scaling challenges" without specifics.
- Reference concrete details from the research (names, numbers, products, competitors).
- If the research didn't find much, acknowledge it and focus on signal-based personalization.

Output ONLY valid JSON: { "opener": "...", "pain_points": ["...", "...", "..."], "opportunity_signals": ["...", "...", "..."], "summary": "..." }`,
    }],
  });

  const text = synthesis.content[0].type === 'text' ? synthesis.content[0].text : '';
  let parsed: {
    opener: string;
    pain_points: string[];
    opportunity_signals: string[];
    summary: string;
  };

  try {
    parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
  } catch {
    parsed = { opener: '', pain_points: [], opportunity_signals: [], summary: '' };
  }

  return {
    company_overview: companyIntel.overview,
    pain_signals: parsed.pain_points || [],
    opportunity_signals: parsed.opportunity_signals || [],
    personalized_opener: parsed.opener || '',
    research_summary: parsed.summary || '',
    contact_profile: personaIntel.profile,
    raw_research: {
      company: companyIntel.overview,
      tech_stack: companyIntel.techStack,
      signal: signalIntel.context,
      contact: personaIntel.profile,
      competitors: companyIntel.competitors.join(', '),
    },
  };
}
