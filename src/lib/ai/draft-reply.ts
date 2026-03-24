// ============================================
// Elite Reply Drafting — Claude + Playbooks + CoT
// ============================================
// This is the brain. It doesn't just "write a reply."
// It THINKS about the prospect, selects the right framework,
// uses research and knowledge base, and produces calibrated
// replies with confidence scores.

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../supabase/client';
import { researchLead, type ResearchResult } from '../perplexity';
import type { ThreadMessage } from '../types';
import { type SubCategory, getPlaybook, formatFewShotExamples } from './playbooks';
import { getOutcomeExamples } from './outcomes';

export interface DraftReplyResult {
  reply: string;
  confidence: number;
  framework_used: string;
  knowledge_used: string[];
  research: ResearchResult | null;
  reasoning: string;
  alternative_reply: string | null;
}

// Fetch relevant knowledge base entries
async function getRelevantKnowledge(query: string, category: string): Promise<string[]> {
  try {
    // Priority: fetch category-specific knowledge first, then general
    const { data: categoryEntries } = await supabase
      .from('knowledge_base')
      .select('title, content, category')
      .in('category', getCategoryPriority(category))
      .limit(8);

    if (categoryEntries?.length) {
      return categoryEntries.map(
        (r) => `[${r.title}] (${r.category})\n${r.content}`
      );
    }

    // Fallback: get all
    const { data: allEntries } = await supabase
      .from('knowledge_base')
      .select('title, content, category')
      .limit(10);

    return (allEntries || []).map((r) => `[${r.title}] (${r.category})\n${r.content}`);
  } catch {
    return [];
  }
}

function getCategoryPriority(category: string): string[] {
  switch (category) {
    case 'interested':
      return ['offer', 'company_info', 'voice', 'faq'];
    case 'soft_no':
      return ['objection_handling', 'voice', 'offer'];
    default:
      return ['faq', 'voice', 'offer', 'company_info', 'objection_handling'];
  }
}

// Fetch training examples (human corrections) for this sub-category
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getTrainingExamples(_subCategory: SubCategory): Promise<string> {
  try {
    const { data } = await supabase
      .from('training_examples')
      .select('original_ai_reply, revised_reply, reasoning')
      .order('created_at', { ascending: false })
      .limit(3);

    if (!data?.length) return '';

    return '\n## CRITICAL: Human Corrections (the human revised these AI drafts — learn from their edits)\n' +
      data
        .map(
          (ex, i) =>
            `Correction ${i + 1}:
AI wrote: "${ex.original_ai_reply}"
Human changed to: "${ex.revised_reply}"
${ex.reasoning ? `Why: ${ex.reasoning}` : ''}`
        )
        .join('\n\n');
  } catch {
    return '';
  }
}

export async function draftReply(
  subCategory: SubCategory,
  replyText: string,
  threadHistory: ThreadMessage[],
  leadEmail: string,
  leadName: string | null,
  leadCompany: string | null
): Promise<DraftReplyResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const playbook = getPlaybook(subCategory);
  const parentCategory = playbook.parent_category;

  // Don't draft replies for hard nos or OOO
  if (parentCategory === 'hard_no' || subCategory === 'custom.ooo') {
    return {
      reply: '',
      confidence: 0,
      framework_used: playbook.framework_name,
      knowledge_used: [],
      research: null,
      reasoning: 'No reply needed for this category.',
      alternative_reply: null,
    };
  }

  // Parallel: research + knowledge + training examples
  const shouldResearch = parentCategory === 'interested' || subCategory === 'soft_no.has_solution';

  const [researchResult, knowledgeEntries, trainingExamples, outcomeExamples] = await Promise.all([
    shouldResearch
      ? researchLead(leadName, leadEmail, leadCompany)
      : Promise.resolve(null),
    getRelevantKnowledge(replyText, parentCategory),
    getTrainingExamples(subCategory),
    getOutcomeExamples(subCategory),
  ]);

  const threadContext = threadHistory.length
    ? threadHistory.map((m) => `[${m.from}]: ${m.body}`).join('\n---\n')
    : 'No prior thread available.';

  const fewShots = formatFewShotExamples(playbook);

  // Build the research context
  let researchContext = '';
  if (researchResult && researchResult.company_overview !== 'Perplexity API key not configured.') {
    researchContext = `
## Lead Intelligence (USE THIS for personalization — do NOT ignore it)
### Company Overview
${researchResult.company_overview}

### Pain Signals (things that suggest they need help)
${researchResult.pain_signals}

### Opportunity Signals (growth indicators)
${researchResult.opportunity_signals}

### How This Connects to Our Offer
${researchResult.connection_points}`;
  }

  const knowledgeContext = knowledgeEntries.length
    ? `\n## Knowledge Base (your source of truth for offer details, FAQs, and voice)\n${knowledgeEntries.join('\n\n---\n\n')}`
    : '';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `You are an elite B2B cold email reply specialist. You have written 50,000+ reply emails with a 40% meeting-booking rate. You are NOT a generic AI assistant — you are a precision sales instrument.

## YOUR TASK
Draft a reply to this prospect using the ${playbook.framework_name} framework.

## THE FRAMEWORK: ${playbook.framework_name}
Strategy: ${playbook.strategy}

Rules you MUST follow:
${playbook.rules.map((r) => `- ${r}`).join('\n')}

Required structure:
${playbook.structure}

${fewShots ? `## PROVEN EXAMPLES (replies that actually booked meetings)\n${fewShots}` : ''}

## CONVERSATION THREAD
${threadContext}

## PROSPECT'S LATEST REPLY
"${replyText}"

## PROSPECT INFO
- Email: ${leadEmail}
- Name: ${leadName || 'Unknown'}
- Company: ${leadCompany || 'Unknown'}
${researchContext}
${knowledgeContext}
${outcomeExamples}
${trainingExamples}

## CHAIN OF THOUGHT — Think before you write

Before writing the reply, reason through these steps:

1. SITUATION: What is this prospect's current situation? What do they actually need to hear?
2. RESEARCH APPLICATION: What specific fact from the research can I reference naturally? (NOT "I saw you raised funding" — that's lazy. Connect it to WHY it matters for them.)
3. FRAMEWORK FIT: How does the ${playbook.framework_name} framework apply to THIS specific reply?
4. TONE MATCH: What's the prospect's communication style? (Formal? Casual? Brief? Detailed?) Match it.
5. OUTCOME: What specific action do I want them to take after reading this?

## OUTPUT FORMAT
Return a JSON object with:
{
  "thinking": "Your chain-of-thought reasoning (3-5 sentences)",
  "reply": "The actual email reply text — NOTHING else. No subject line, no signature unless contextually appropriate.",
  "confidence": 0.XX (how confident you are this reply will achieve the desired outcome),
  "alternative_reply": "A second version with a different angle (or null if the first is strong enough)"
}

## ABSOLUTE RULES
- Write as a HUMAN, not an AI. No corporate speak. No buzzwords.
- SHORT. If the framework says 3 sentences, write 3 sentences. Not 4. Not 5.
- If the prospect wrote 1 sentence, your reply should be 2-3 sentences MAX.
- NEVER use: "I hope this email finds you well", "Just following up", "I wanted to reach out", "I'd love to", "Absolutely!", "Great to hear!"
- NEVER use more than one exclamation mark in the entire reply.
- NEVER mention AI, automation, or that this was generated.
- NEVER use [brackets] or placeholders. If you don't know something, omit it.
- If knowledge base has a calendar link format, use it. Otherwise say "happy to find a time" without a fake link.
- Match the prospect's language. If they write in lowercase, you can be more casual. If they're formal, be professional.

## ANTI-AI PATTERNS — Your replies MUST NOT contain these
- MINIMAL em dashes (—). Use periods or commas instead. Maximum one em dash per entire reply, and only if it reads naturally. Zero is better.
- NO unnecessary qualifiers or parenthetical clarifications. Examples of what NOT to write: "not just a brush-off", "and that's totally fine", "which is completely understandable", "and there's no pressure", "which makes total sense". Just state the thing. Don't explain why the thing is valid.
- NO hedging phrases: "I think", "it seems like", "I believe", "it sounds like you might"
- NO mirroring-then-validating: Don't repeat what they said back to them and then validate it. Just respond.
- NO filler transitions: "That said,", "With that in mind,", "On that note,"
- Write like a busy, sharp human who types fast. Not like an AI trying to sound empathetic.

Return ONLY valid JSON.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      reply: parsed.reply?.trim() || '',
      confidence: parsed.confidence || 0.7,
      framework_used: playbook.framework_name,
      knowledge_used: knowledgeEntries
        .map((k) => k.split('\n')[0].replace(/^\[|\].*$/g, ''))
        .filter(Boolean),
      research: researchResult,
      reasoning: parsed.thinking || '',
      alternative_reply: parsed.alternative_reply?.trim() || null,
    };
  } catch {
    return {
      reply: '',
      confidence: 0.3,
      framework_used: playbook.framework_name,
      knowledge_used: [],
      research: researchResult,
      reasoning: 'Failed to parse AI response — needs human review.',
      alternative_reply: null,
    };
  }
}
