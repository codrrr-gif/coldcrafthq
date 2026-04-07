// src/lib/enrichment/research-agent.ts
// ============================================
// Signal-aware research using Perplexity + Claude.
// Extends the existing perplexity.ts with signal context
// to generate a personalized opener tied to the specific trigger.
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import type { ResearchResult, SignalType } from '@/lib/gtm/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getOpenerExamples(signalType: SignalType): Promise<string> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await sb
      .from('opener_patterns')
      .select('id, pattern_summary, example_opener, times_used')
      .eq('signal_type', signalType)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!data?.length) return '';

    // Increment times_used in background
    for (const row of data as Array<{ pattern_summary: string; example_opener: string; id?: string; times_used?: number }>) {
      if (row.id) sb.from('opener_patterns').update({ times_used: (row.times_used || 0) + 1 }).eq('id', row.id).then(null, () => null);
    }

    const examples = (data as Array<{ pattern_summary: string; example_opener: string }>)
      .map((p, i) => `Example ${i + 1}: "${p.example_opener}" (Pattern: ${p.pattern_summary})`)
      .join('\n');
    return `\nPROVEN OPENER PATTERNS (from leads that replied "interested"):\n${examples}\n`;
  } catch {
    return '';
  }
}

const SIGNAL_RESEARCH_PROMPTS: Record<SignalType, string> = {
  funding: 'What are they planning to do with the funding? What are they hiring for? What growth stage are they at? What problems will they face scaling?',
  job_posting: 'What does this hiring signal indicate about their growth stage and operational needs? What pain points does this role suggest they have?',
  leadership_change: 'What has this person built at their previous company? What are they likely to change or evaluate first in their new role? What tools/vendors do people in this role typically evaluate?',
  news: 'What does this news signal about the company direction? What opportunities or challenges does it create?',
  intent: 'What does their interest in this topic indicate about their buying stage? What pain points are they researching solutions for?',
  tech_stack: 'What does their current tech stack tell us about their needs? Are they likely evaluating alternatives? What problems does their current setup typically cause?',
  competitor_review: 'They left a negative review of a competitor. What frustrations did they express? What would they want in a replacement? What is the ideal pitch for someone actively dissatisfied?',
  job_change: 'This person recently moved companies. What typically gets re-evaluated in the first 90 days of a new sales/marketing leadership role? What tools/vendors will they be looking at?',
};

async function searchPerplexity(query: string): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [{ role: 'user', content: query }],
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) return '';
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

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

  // Fetch proven opener patterns (non-blocking — if it fails, we proceed without)
  const openerExamples = await getOpenerExamples(signalType).catch(() => '');

  // Single batched Perplexity search (saves 2 API calls per lead)
  const batchedQuery = `Research for cold email outreach to ${firstName} ${lastName}, ${title} at ${companyName} (${domain}).

Answer ALL of these in order, separated by "---":

1. COMPANY: What does ${companyName} do? Who are their customers? How many employees? What's their tech stack? Are they B2B SaaS?

2. SIGNAL: ${signalSummary}. ${SIGNAL_RESEARCH_PROMPTS[signalType]}

3. CONTACT: ${firstName} ${lastName} ${title} at ${companyName}: background, previous companies, what have they built before, LinkedIn activity`;

  const batchedResult = await searchPerplexity(batchedQuery);
  const sections = batchedResult.split(/---+/);
  const companyResearch = sections[0]?.trim() || batchedResult;
  const signalContext = sections[1]?.trim() || '';
  const contactResearch = sections[2]?.trim() || '';

  // Claude synthesizes a personalized opener
  const synthesis = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `You are writing a cold email opening line for a B2B outbound campaign. The prospect is Problem Aware — they know the pain but haven't actively sought a solution.

SIGNAL: ${signalSummary}
COMPANY: ${companyName}
CONTACT: ${firstName} ${lastName}, ${title}

COMPANY INTEL:
${companyResearch}

SIGNAL CONTEXT:
${signalContext}

CONTACT PROFILE:
${contactResearch}
${openerExamples}
Write:
1. A personalized opener (UNDER 15 WORDS) that references the specific signal as a timeline hook. Enter the conversation already happening in their mind. Write from THEIR perspective — what they're experiencing, not what you observed.
2. Three bullet pain points this company likely has RIGHT NOW given the signal
3. Three opportunity signals (reasons they'd be receptive)
4. A 2-sentence research summary

OPENER RULES:
- UNDER 15 WORDS. This is a single punchy line, not a full sentence paragraph.
- First word must NOT be "I" — start with their company, their situation, their world.
- Use a timeline hook: tie the signal to a natural consequence or emerging need.
- Reference the SPECIFIC signal detail (funding amount, exact role title, news headline).
- Personalization hierarchy (aim highest): (1) something they personally said/built/shipped, (2) a specific challenge this signal creates for them, (3) their role + the signal, (4) company + signal.

VOICE: Direct, specific, understated. Like a peer who follows their space closely. No hype, no flattery, no filler.

BANNED PHRASES (instant reject):
- No em dashes. No semicolons.
- No "I noticed", "I came across", "I saw that", "I was researching"
- No "Congratulations on", "Congrats on", "Exciting times", "Impressive"
- No "I hope this finds you", "I wanted to reach out", "I'd love to"
- No "leveraging", "synergies", "game-changer", "cutting-edge", "innovative"
- No "It caught my eye", "Your recent", "I stumbled upon"

GOOD opener examples:
- "${companyName}'s Series B puts pressure on pipeline before the new hires ramp."
- "Hiring a Head of Sales usually means the founder pipeline model hit its ceiling."
- "Post-acquisition integrations almost always stall outbound for 3-6 months."

Output as JSON: { "opener": "...", "pain_points": ["...", "...", "..."], "opportunity_signals": ["...", "...", "..."], "summary": "..." }`
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
    company_overview: companyResearch,
    pain_signals: parsed.pain_points || [],
    opportunity_signals: parsed.opportunity_signals || [],
    personalized_opener: parsed.opener || '',
    research_summary: parsed.summary || '',
    contact_profile: contactResearch,
    raw_research: { company: companyResearch, signal: signalContext, contact: contactResearch },
  };
}
