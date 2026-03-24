// src/lib/conversation/reply-drafter.ts
// Uses Claude to draft a reply based on the reply classification.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function draftReply(params: {
  classification: string;
  inboundText: string;
  firstName: string;
  companyName: string;
  signalSummary: string | null;
}): Promise<string | null> {
  // No reply needed for these
  if (params.classification === 'unsubscribe' || params.classification === 'auto_reply') {
    return null;
  }

  const calendlyLink = process.env.CALENDLY_LINK || '[CALENDLY_LINK]';

  const prompts: Record<string, string> = {
    interested: `Draft a concise, warm reply (3-5 sentences). Acknowledge their interest, offer to hop on a 15-minute call, include this Calendly link: ${calendlyLink}. No fluff.`,
    not_now: `Draft a brief, gracious reply (2-3 sentences). Acknowledge the timing, offer to reconnect in 30 days. Leave the door open with zero pressure.`,
    wrong_person: `Draft a 2-sentence reply asking who the best person to speak with would be. Polite, brief, direct.`,
    question: `Draft a helpful, specific answer to their question (3-4 sentences). Be direct and informative. End with a soft CTA for a quick 15-min call.`,
    other: `Draft a professional 2-sentence reply acknowledging their message and keeping the conversation open.`,
  };

  const prompt = prompts[params.classification] || prompts.other;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `${prompt}

Context:
- Prospect: ${params.firstName} at ${params.companyName}
- Their reply: "${params.inboundText.slice(0, 300)}"
- Our outreach was about: ${params.signalSummary || 'a relevant signal we noticed'}

Draft reply (no subject line, just the body):`,
      }],
    });

    return ((msg.content[0] as { type: string; text: string }).text || '').trim() || null;
  } catch (err) {
    console.error('[reply-drafter] Draft failed:', err);
    return null;
  }
}
