// src/lib/conversation/reply-classifier.ts
// Uses Claude to classify inbound cold email replies into 7 categories.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export type ReplyClass =
  | 'interested'
  | 'not_now'
  | 'wrong_person'
  | 'question'
  | 'unsubscribe'
  | 'auto_reply'
  | 'other';

const VALID_CLASSES: ReplyClass[] = [
  'interested', 'not_now', 'wrong_person', 'question', 'unsubscribe', 'auto_reply', 'other',
];

export async function classifyReply(replyText: string): Promise<ReplyClass> {
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 20,
      messages: [{
        role: 'user',
        content: `Classify this B2B cold email reply into exactly one category.

Categories:
- interested: wants to learn more, open to a call, positive response
- not_now: not interested right now, bad timing, maybe later
- wrong_person: wrong contact, forward to someone else
- question: asking a specific question about the product/offer
- unsubscribe: wants to be removed, stop emailing
- auto_reply: out of office, automated vacation response
- other: anything else

Reply: "${replyText.slice(0, 500)}"

Respond with ONLY the category name, nothing else.`,
      }],
    });

    const raw = ((msg.content[0] as { type: string; text: string }).text || '').trim().toLowerCase();
    return VALID_CLASSES.includes(raw as ReplyClass) ? (raw as ReplyClass) : 'other';
  } catch (err) {
    console.error('[reply-classifier] Classification failed:', err);
    return 'other';
  }
}
