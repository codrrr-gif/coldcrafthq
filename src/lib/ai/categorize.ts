// ============================================
// Elite Reply Categorization — Claude + CoT
// ============================================
// Chain-of-thought reasoning with granular sub-categories
// and calibrated confidence scoring.

import Anthropic from '@anthropic-ai/sdk';
import type { ThreadMessage } from '../types';
import type { SubCategory } from './playbooks';

export interface CategorizationResult {
  category: 'interested' | 'soft_no' | 'hard_no' | 'custom';
  sub_category: SubCategory;
  confidence: number;
  reasoning: string;
  summary: string;
  tone: 'positive' | 'neutral' | 'negative' | 'hostile';
  urgency: 'high' | 'medium' | 'low';
  prospect_name: string | null;
  prospect_company: string | null;
}

export async function categorizeReply(
  replyText: string,
  threadHistory: ThreadMessage[]
): Promise<CategorizationResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const threadContext = threadHistory.length
    ? threadHistory.map((m) => `[${m.from}]: ${m.body}`).join('\n---\n')
    : 'No prior thread history available.';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `You are an expert cold email reply analyst with 10 years of B2B outbound experience. You've analyzed 100,000+ replies and you know exactly what each one means.

Analyze this prospect's reply using chain-of-thought reasoning.

## Conversation Thread
${threadContext}

## Latest Reply to Categorize
"${replyText}"

## Step 1: THINK about what this reply actually means
Consider:
- What is the prospect's INTENT? (Not just their words — what do they actually mean?)
- What is their emotional TONE? (Are they being polite? Annoyed? Enthusiastic? Curt?)
- Is there an implicit buying signal or objection hidden in their words?
- Are they the decision maker or are they deflecting to someone else?
- How URGENT is this? (A "yes let's talk" is high urgency. A "not right now" is low.)

## Step 2: CLASSIFY into the correct sub-category

Sub-categories (choose ONE):

**INTERESTED (buying signals detected):**
- interested.ready_to_book — Explicit yes. "Let's set up a call", "I'm interested", "Sure", "Sounds good", agreeing to next step
- interested.wants_info — Wants to know more before committing. "Tell me more", "Send info", "What does this cost?"
- interested.asking_questions — Specific questions about the offer, process, results. Evaluating.
- interested.referral — Points to someone else who should hear this. "Talk to our VP of Sales"
- interested.conditional — Interested IF a condition is met. "If you work with X...", "If the price is under Y..."

**SOFT NO (declined but door isn't closed):**
- soft_no.timing — Bad timing. "Not right now", "Maybe later", "Too busy", "Check back in Q3"
- soft_no.not_interested — Polite decline. "Not interested", "No thanks", "We're good", "Pass"
- soft_no.has_solution — Already has something. "We use [competitor]", "We already work with an agency"
- soft_no.budget — Cost concern. "Out of budget", "Too expensive", "Can't afford it right now"
- soft_no.authority — Not the decision maker. "I'm not the right person", "You'd need to talk to..."

**HARD NO (do not contact again):**
- hard_no.unsubscribe — "Remove me", "Unsubscribe", "Stop emailing", "Take me off your list"
- hard_no.hostile — Angry, rude, aggressive. Insults, profanity, strong negativity
- hard_no.legal_threat — Threatens legal action, mentions lawyers, CAN-SPAM, GDPR

**CUSTOM (doesn't fit standard patterns):**
- custom.ooo — Out of office / auto-reply
- custom.forwarded — "I'll forward this", "Sending to my colleague"
- custom.question — Asks something unrelated to buying
- custom.other — Nothing above fits

## Step 3: SCORE your confidence (be calibrated)
- 0.95-1.0: You are certain. The reply is unambiguous.
- 0.85-0.94: Very confident. Clear signal with minor ambiguity.
- 0.70-0.84: Confident but there's some interpretation involved.
- 0.50-0.69: Uncertain. Could go either way. Human should review.
- Below 0.50: Very uncertain. Definitely needs human review.

IMPORTANT: Do NOT default to high confidence. If the reply is ambiguous, short, or could mean multiple things, score LOWER. One-word replies are inherently ambiguous — score them 0.70-0.85 max.

## Step 4: Extract prospect info
- Extract prospect's first name if visible in the reply or thread
- Extract company name if visible

Respond in this exact JSON format:
{
  "thinking": "Your step-by-step reasoning (2-4 sentences analyzing the reply)",
  "category": "interested|soft_no|hard_no|custom",
  "sub_category": "the exact sub_category string from above",
  "confidence": 0.XX,
  "summary": "One-line summary of what the prospect said/meant",
  "tone": "positive|neutral|negative|hostile",
  "urgency": "high|medium|low",
  "prospect_name": "First name or null",
  "prospect_company": "Company name or null"
}

Return ONLY valid JSON, no other text.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      category: parsed.category,
      sub_category: parsed.sub_category,
      confidence: parsed.confidence,
      reasoning: parsed.thinking || parsed.reasoning,
      summary: parsed.summary,
      tone: parsed.tone || 'neutral',
      urgency: parsed.urgency || 'medium',
      prospect_name: parsed.prospect_name || null,
      prospect_company: parsed.prospect_company || null,
    };
  } catch {
    return {
      category: 'custom',
      sub_category: 'custom.other',
      confidence: 0.3,
      reasoning: 'Failed to parse AI categorization — flagged for human review.',
      summary: replyText.slice(0, 100),
      tone: 'neutral',
      urgency: 'medium',
      prospect_name: null,
      prospect_company: null,
    };
  }
}
