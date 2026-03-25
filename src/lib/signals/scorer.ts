// src/lib/signals/scorer.ts
import { SIGNAL_SCORES } from './types';
import { supabase } from '@/lib/supabase/client';
import type { SignalType } from '@/lib/gtm/types';

// Cache learning weights for 5 minutes to avoid DB hits on every signal
let _weightCache: Map<string, number> = new Map();
let _weightCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getLearnedBaseScore(signalType: SignalType): Promise<number> {
  // Refresh cache if stale
  if (Date.now() - _weightCacheTime > CACHE_TTL_MS) {
    const { data } = await supabase
      .from('learning_weights')
      .select('dimension_value, learned_score')
      .eq('weight_type', 'signal');

    _weightCache = new Map();
    for (const w of data || []) {
      // learned_score is 0-200 scale, normalize to 0-100 for the scorer
      _weightCache.set(w.dimension_value, Math.round(w.learned_score / 2));
    }
    _weightCacheTime = Date.now();
  }

  return _weightCache.get(signalType) ?? SIGNAL_SCORES[signalType];
}

// Score a signal 0-100 based on type, recency, and headline signals
export async function scoreSignal(
  signalType: SignalType,
  signalDate: string | null,
  headline: string,
): Promise<number> {
  let score = await getLearnedBaseScore(signalType);

  // Date validation: reject signals with future dates or older than 90 days
  if (signalDate) {
    const signalTime = new Date(signalDate).getTime();
    const now = Date.now();
    const daysSince = Math.floor((now - signalTime) / (1000 * 60 * 60 * 24));

    // Future date or impossibly old — clamp to reasonable range
    if (daysSince < -1) {
      console.warn(`[scorer] Future signal date detected: ${signalDate}, clamping`);
      // Treat as today
    } else if (daysSince > 90) {
      return 30; // Too old, minimum score
    } else if (daysSince > 7) {
      score = Math.max(score - Math.floor((daysSince - 7) / 7) * 10, 30);
    }
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
