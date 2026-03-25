// ============================================
// Self-Improvement Engine — Learn from Outcomes
// ============================================
// The system learns what ACTUALLY works by tracking
// what happens after we send a reply. No human needed.

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../supabase/client';
import type { ReplyCategory } from '../types';
import type { SubCategory } from './playbooks';
import { PLAYBOOKS } from './playbooks';

export type Outcome = 'reply_positive' | 'reply_negative' | 'reply_neutral' | 'silence' | 'meeting_booked';

export interface OutcomeExample {
  sub_category: string;
  prospect_message: string;
  our_reply: string;
  outcome: Outcome;
  outcome_detail: string | null;
  is_winner: boolean;
  lesson: string | null;
}

// Determine outcome based on how the prospect responded to our reply
export function determineOutcome(followUpCategory: ReplyCategory): Outcome {
  switch (followUpCategory) {
    case 'interested':
      return 'reply_positive';
    case 'soft_no':
      return 'reply_neutral';
    case 'hard_no':
      return 'reply_negative';
    default:
      return 'reply_neutral';
  }
}

// Score a sent reply based on the prospect's follow-up
export async function scoreReplyOutcome(
  parentReplyId: string,
  followUpReplyId: string,
  outcome: Outcome,
  followUpText: string
): Promise<void> {
  // Update the parent reply with outcome
  await supabase
    .from('replies')
    .update({
      outcome,
      outcome_evaluated_at: new Date().toISOString(),
      outcome_reply_id: followUpReplyId,
    })
    .eq('id', parentReplyId);

  // Fetch the parent reply to create an outcome example
  const { data: parent } = await supabase
    .from('replies')
    .select('sub_category, framework_used, original_message, final_reply')
    .eq('id', parentReplyId)
    .single();

  if (!parent?.final_reply || !parent?.sub_category) return;

  const isWinner = outcome === 'reply_positive' || outcome === 'meeting_booked';

  // Extract a lesson using Claude
  const lesson = await extractLesson(
    parent.original_message,
    parent.final_reply,
    followUpText,
    outcome,
    isWinner
  );

  // Check for duplicates
  const { data: existing } = await supabase
    .from('outcome_examples')
    .select('id')
    .eq('reply_id', parentReplyId)
    .limit(1);

  if (existing?.length) return; // Already scored

  await supabase.from('outcome_examples').insert({
    reply_id: parentReplyId,
    sub_category: parent.sub_category,
    framework_used: parent.framework_used,
    prospect_message: parent.original_message,
    our_reply: parent.final_reply,
    outcome,
    outcome_detail: followUpText.slice(0, 500),
    is_winner: isWinner,
    lesson,
  });
}

// Use Claude to extract a lesson from the outcome
async function extractLesson(
  prospectMessage: string,
  ourReply: string,
  followUpText: string | null,
  outcome: Outcome,
  isWinner: boolean
): Promise<string | null> {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const outcomeDesc = {
      reply_positive: 'The prospect responded positively',
      reply_negative: 'The prospect responded negatively',
      reply_neutral: 'The prospect gave a non-committal response',
      silence: 'The prospect never responded',
      meeting_booked: 'The prospect booked a meeting',
    }[outcome];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Analyze this cold email exchange and extract ONE lesson (1-2 sentences max).

Prospect said: "${prospectMessage}"
We replied: "${ourReply}"
${followUpText ? `They then said: "${followUpText}"` : ''}
Outcome: ${outcomeDesc}

${isWinner
  ? 'What specifically about our reply WORKED? Be concrete — was it the tone, length, specific phrase, CTA style, personalization?'
  : 'What specifically about our reply FAILED? Be concrete — was it too long, wrong tone, too pushy, missed the point?'
}

Reply with ONLY the lesson, no preamble.`,
      }],
    });

    return response.content[0].type === 'text' ? response.content[0].text.trim() : null;
  } catch {
    return null;
  }
}

// Get winning and losing examples for the drafting prompt
export async function getOutcomeExamples(subCategory: SubCategory): Promise<string> {
  try {
    const parentCategory = subCategory.split('.')[0];

    // Try sub-category first, fall back to parent category
    const { data: winners } = await supabase
      .from('outcome_examples')
      .select('prospect_message, our_reply, outcome, lesson')
      .eq('is_winner', true)
      .or(`sub_category.eq.${subCategory},sub_category.like.${parentCategory}.%`)
      .order('created_at', { ascending: false })
      .limit(2);

    const { data: losers } = await supabase
      .from('outcome_examples')
      .select('prospect_message, our_reply, outcome, lesson')
      .eq('is_winner', false)
      .or(`sub_category.eq.${subCategory},sub_category.like.${parentCategory}.%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!winners?.length && !losers?.length) return '';

    let result = '\n## OUTCOME DATA: What actually worked and what didn\'t (from real conversations)\n';

    if (winners?.length) {
      result += '\n### WINNING REPLIES (these got positive responses or booked meetings — write MORE like these):\n';
      winners.forEach((w, i) => {
        result += `\nWinner ${i + 1}:
Prospect: "${w.prospect_message.slice(0, 200)}"
We replied: "${w.our_reply}"
Result: ${w.outcome === 'meeting_booked' ? 'Meeting booked' : 'Got positive response'}
${w.lesson ? `Lesson: ${w.lesson}` : ''}\n`;
      });
    }

    if (losers?.length) {
      result += '\n### LOSING REPLIES (these got silence or negative responses — AVOID these patterns):\n';
      losers.forEach((l, i) => {
        result += `\nLoser ${i + 1}:
Prospect: "${l.prospect_message.slice(0, 200)}"
We replied: "${l.our_reply}"
Result: ${l.outcome === 'silence' ? 'No response' : 'Negative response'}
${l.lesson ? `Lesson: ${l.lesson}` : ''}\n`;
      });
    }

    return result;
  } catch {
    return '';
  }
}

// Check for sent replies that got no response (silence detection)
export async function evaluateSilentOutcomes(): Promise<number> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // Find sent replies older than 3 days with no outcome
  const { data: staleReplies } = await supabase
    .from('replies')
    .select('id, lead_email, sub_category, final_reply, original_message')
    .eq('status', 'sent')
    .is('outcome', null)
    .lte('created_at', threeDaysAgo)
    .limit(50);

  if (!staleReplies?.length) return 0;

  let scored = 0;
  for (const reply of staleReplies) {
    // Check if a newer reply exists from this lead (webhook might have missed it)
    const { data: followUp } = await supabase
      .from('replies')
      .select('id')
      .eq('lead_email', reply.lead_email)
      .neq('id', reply.id)
      .gt('created_at', threeDaysAgo)
      .limit(1);

    if (followUp?.length) continue; // Has a follow-up, skip silence scoring

    // Mark as silence
    await supabase
      .from('replies')
      .update({
        outcome: 'silence',
        outcome_evaluated_at: new Date().toISOString(),
      })
      .eq('id', reply.id);

    // Create losing outcome example
    if (reply.final_reply && reply.sub_category) {
      const lesson = await extractLesson(
        reply.original_message,
        reply.final_reply,
        null,
        'silence',
        false
      );

      await supabase.from('outcome_examples').insert({
        reply_id: reply.id,
        sub_category: reply.sub_category,
        prospect_message: reply.original_message,
        our_reply: reply.final_reply,
        outcome: 'silence',
        is_winner: false,
        lesson,
      });
    }

    scored++;
  }

  return scored;
}

// Auto-tune confidence thresholds based on outcome data
export async function tuneThresholds(): Promise<{ adjusted: number }> {
  const subCategories = Object.keys(PLAYBOOKS) as SubCategory[];
  let adjusted = 0;

  for (const subCat of subCategories) {
    const playbook = PLAYBOOKS[subCat];
    if (!playbook.auto_send_eligible) continue;

    // Get all outcome-scored replies for this sub-category
    const { data: scored } = await supabase
      .from('replies')
      .select('outcome, confidence, auto_sent')
      .eq('sub_category', subCat)
      .eq('status', 'sent')
      .not('outcome', 'is', null);

    if (!scored || scored.length < 10) continue; // Need minimum sample

    const wins = scored.filter(r =>
      r.outcome === 'reply_positive' || r.outcome === 'meeting_booked'
    ).length;
    const winRate = wins / scored.length;

    const currentThreshold = await getEffectiveThreshold(subCat);
    let newThreshold = currentThreshold;
    let reason = '';

    if (winRate >= 0.85 && scored.length >= 20) {
      newThreshold = Math.max(0.85, currentThreshold - 0.03);
      reason = `Win rate ${(winRate * 100).toFixed(0)}% with ${scored.length} samples — high performance, relaxing threshold`;
    } else if (winRate >= 0.70) {
      newThreshold = Math.max(0.85, currentThreshold - 0.02);
      reason = `Win rate ${(winRate * 100).toFixed(0)}% — good performance, slightly relaxing threshold`;
    } else if (winRate < 0.40) {
      newThreshold = Math.min(0.98, currentThreshold + 0.03);
      reason = `Win rate ${(winRate * 100).toFixed(0)}% — poor performance, tightening threshold`;
    }

    if (newThreshold !== currentThreshold) {
      await supabase.from('threshold_adjustments').insert({
        sub_category: subCat,
        old_threshold: currentThreshold,
        new_threshold: newThreshold,
        sample_size: scored.length,
        win_rate: winRate,
        reason,
      });
      adjusted++;
    }
  }

  return { adjusted };
}

// Get effective threshold (check for auto-tuned override, fall back to static)
export async function getEffectiveThreshold(subCategory: SubCategory): Promise<number> {
  try {
    const { data } = await supabase
      .from('threshold_adjustments')
      .select('new_threshold')
      .eq('sub_category', subCategory)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data?.length) return data[0].new_threshold;
  } catch {
    // Table might not exist yet
  }

  return PLAYBOOKS[subCategory].max_confidence_threshold;
}
