// src/lib/signals/scorer.ts
import { SIGNAL_SCORES } from './types';
import type { SignalType } from '@/lib/gtm/types';

// Score a signal 0-100 based on type, recency, and headline signals
export function scoreSignal(
  signalType: SignalType,
  signalDate: string | null,
  headline: string,
): number {
  let score = SIGNAL_SCORES[signalType];

  // Recency decay: full score within 7 days, -10 per week after
  if (signalDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(signalDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince > 7) score = Math.max(score - Math.floor((daysSince - 7) / 7) * 10, 30);
  }

  // Headline boosters
  const h = headline.toLowerCase();
  if (h.includes('series a') || h.includes('series b')) score = Math.min(score + 10, 100);
  if (h.includes('million') || h.includes('raises')) score = Math.min(score + 5, 100);
  if (h.includes('vp sales') || h.includes('chief revenue')) score = Math.min(score + 10, 100);
  if (h.includes('head of growth') || h.includes('vp marketing')) score = Math.min(score + 8, 100);

  // Headline penalties
  if (h.includes('acquisition') || h.includes('acquired')) score = Math.max(score - 20, 10);
  if (h.includes('layoff') || h.includes('cuts') || h.includes('shutdown')) score = Math.max(score - 30, 10);

  return score;
}

// Minimum score threshold to create a pipeline lead
export const MIN_SIGNAL_SCORE = parseInt(process.env.MIN_SIGNAL_SCORE || '55');
