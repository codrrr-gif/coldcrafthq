// src/lib/enrichment/research-agent.ts
// ============================================
// Signal-aware research using Perplexity + Claude.
// Extends the existing perplexity.ts with signal context
// to generate a personalized opener tied to the specific trigger.
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import type { ResearchResult, SignalType } from '@/lib/gtm/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SIGNAL_RESEARCH_PROMPTS: Record<SignalType, string> = {
  funding: 'What are they planning to do with the funding? What are they hiring for? What growth stage are they at? What problems will they face scaling?',
  job_posting: 'What does this hiring signal indicate about their growth stage and operational needs? What pain points does this role suggest they have?',
  leadership_change: 'What has this person built at their previous company? What are they likely to change or evaluate first in their new role? What tools/vendors do people in this role typically evaluate?',
  news: 'What does this news signal about the company direction? What opportunities or challenges does it create?',
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
      max_tokens: 400,
    }),
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

  // 3 parallel Perplexity searches
  const [companyResearch, signalContext, contactResearch] = await Promise.all([
    searchPerplexity(
      `${companyName} (${domain}): what do they do, who are their customers, how many employees, what's their tech stack, are they B2B SaaS?`
    ),
    searchPerplexity(
      `${companyName} ${signalSummary}. ${SIGNAL_RESEARCH_PROMPTS[signalType]}`
    ),
    searchPerplexity(
      `${firstName} ${lastName} ${title} at ${companyName}: background, previous companies, what have they built before, LinkedIn activity`
    ),
  ]);

  // Claude synthesizes a personalized opener
  const synthesis = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `You are writing a cold email opening line. It must sound like a human who did their homework — not AI.

SIGNAL: ${signalSummary}
COMPANY: ${companyName}
CONTACT: ${firstName} ${lastName}, ${title}

COMPANY INTEL:
${companyResearch}

SIGNAL CONTEXT:
${signalContext}

CONTACT PROFILE:
${contactResearch}

Write:
1. A 1-sentence personalized opener for a cold email that naturally references the specific signal
2. Three bullet pain points this company likely has RIGHT NOW given the signal
3. Three opportunity signals (reasons they'd be receptive)
4. A 2-sentence research summary

Rules:
- Opener must reference the SPECIFIC signal (funding amount, role they're hiring for, etc.)
- No em dashes. No "I noticed". No "I came across". No "Congratulations on".
- Sound like you follow the space, not like you scraped a database.
- Be direct and specific.

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
