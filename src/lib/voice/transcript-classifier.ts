// src/lib/voice/transcript-classifier.ts
// Uses Claude to classify voice call transcripts into outcomes.
// Replaces brittle keyword matching with AI-powered classification.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export type VoiceOutcome =
  | 'interested'
  | 'not_interested'
  | 'callback_requested'
  | 'meeting_booked'
  | 'voicemail'
  | 'wrong_number'
  | 'no_answer';

const VALID_OUTCOMES: VoiceOutcome[] = [
  'interested', 'not_interested', 'callback_requested',
  'meeting_booked', 'voicemail', 'wrong_number', 'no_answer',
];

export async function classifyTranscript(
  transcript: string,
  durationSeconds: number,
): Promise<VoiceOutcome> {
  // Fast path: no transcript or very short call
  if (!transcript.trim() && durationSeconds < 5) return 'no_answer';
  if (!transcript.trim() && durationSeconds < 20) return 'voicemail';

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 30,
      messages: [{
        role: 'user',
        content: `Classify this B2B sales follow-up call transcript into exactly one outcome.

Outcomes:
- interested: prospect expressed interest, asked questions, wanted to learn more
- not_interested: prospect clearly declined, asked to be removed, said no
- callback_requested: prospect asked to call back at a better time
- meeting_booked: prospect agreed to schedule a meeting or said yes to a call
- voicemail: call went to voicemail, only agent spoke
- wrong_number: reached wrong person or wrong company
- no_answer: no meaningful conversation happened

Call duration: ${durationSeconds} seconds
Transcript: "${transcript.slice(0, 1000)}"

Respond with ONLY the outcome name, nothing else.`,
      }],
    });

    const raw = ((msg.content[0] as { type: string; text: string }).text || '').trim().toLowerCase();
    return VALID_OUTCOMES.includes(raw as VoiceOutcome) ? (raw as VoiceOutcome) : 'no_answer';
  } catch (err) {
    console.error('[transcript-classifier] Classification failed:', err);
    // Fallback to duration-based heuristic
    if (durationSeconds < 5) return 'no_answer';
    if (durationSeconds < 20) return 'voicemail';
    return 'no_answer';
  }
}
