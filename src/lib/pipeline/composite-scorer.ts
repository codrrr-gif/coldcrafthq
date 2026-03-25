// src/lib/pipeline/composite-scorer.ts
// ============================================
// Composite Lead Score
// Combines 3 dimensions into a single 0-100 prioritization metric:
//   1. Signal strength  (40% weight) — how strong is the trigger event
//   2. Email deliverability (20% weight) — how likely email reaches inbox
//   3. Company fit      (40% weight) — how well company matches ICP
//
// Pure function, no side effects — easy to test and reason about.
// ============================================

export function calculateCompositeScore(params: {
  signal_score: number | null;  // 0-200 range from signal scorer
  email_score: number | null;   // 0-100 from verification pipeline
  tam_score: number | null;     // 0-100 from company scorer
}): number {
  // Normalize signal_score from 0-200 to 0-100
  const signalNorm = Math.min(100, Math.max(0, (params.signal_score || 0) / 2));
  const emailNorm = Math.min(100, Math.max(0, params.email_score || 50));   // default 50 if unknown
  const tamNorm = Math.min(100, Math.max(0, params.tam_score || 40));       // default 40 if unknown

  const SIGNAL_WEIGHT = 0.40;
  const EMAIL_WEIGHT = 0.20;
  const TAM_WEIGHT = 0.40;

  return Math.round(
    signalNorm * SIGNAL_WEIGHT +
    emailNorm * EMAIL_WEIGHT +
    tamNorm * TAM_WEIGHT
  );
}
