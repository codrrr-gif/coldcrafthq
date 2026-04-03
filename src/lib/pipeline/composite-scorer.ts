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

// Compute TAM score from enrichment data when companies table doesn't have it
const SIZE_SCORES: Record<string, number> = {
  '1-10': 40,     // too small, limited budget
  '11-50': 70,    // sweet spot for SMB
  '51-200': 90,   // ideal mid-market
  '201-500': 80,  // good but harder to reach
  '500+': 50,     // enterprise, cold email less effective
  'unknown': 50,
};

const INDUSTRY_BOOSTS: Record<string, number> = {
  'saas': 20, 'software': 20, 'technology': 15, 'fintech': 15,
  'martech': 15, 'adtech': 15, 'e-commerce': 10, 'ecommerce': 10,
  'ai': 15, 'artificial intelligence': 15, 'machine learning': 15,
  'cybersecurity': 10, 'data analytics': 10,
};

export function estimateTamScore(params: {
  company_size: string | null;
  company_industry: string | null;
  company_location: string | null;
}): number {
  let score = SIZE_SCORES[params.company_size || 'unknown'] || 50;

  // Industry boost
  if (params.company_industry) {
    const ind = params.company_industry.toLowerCase();
    for (const [key, boost] of Object.entries(INDUSTRY_BOOSTS)) {
      if (ind.includes(key)) { score += boost; break; }
    }
  }

  // Geography boost — US/UK get slight preference
  if (params.company_location) {
    const loc = params.company_location.toUpperCase();
    if (['US', 'USA', 'UK', 'GB', 'CA'].some(g => loc.includes(g))) score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

export function calculateCompositeScore(params: {
  signal_score: number | null;  // 0-100 from signal scorer
  email_score: number | null;   // 0-100 from verification pipeline
  tam_score: number | null;     // 0-100 from company scorer
  company_size?: string | null;
  company_industry?: string | null;
  company_location?: string | null;
}): number {
  const signalNorm = Math.min(100, Math.max(0, params.signal_score || 0));
  const emailNorm = Math.min(100, Math.max(0, params.email_score || 50));   // default 50 if unknown

  // Use real TAM score if available, otherwise estimate from enrichment data
  let tamNorm: number;
  if (params.tam_score) {
    tamNorm = Math.min(100, Math.max(0, params.tam_score));
  } else if (params.company_size || params.company_industry) {
    tamNorm = estimateTamScore({
      company_size: params.company_size || null,
      company_industry: params.company_industry || null,
      company_location: params.company_location || null,
    });
  } else {
    tamNorm = 40; // true unknown
  }

  const SIGNAL_WEIGHT = 0.40;
  const EMAIL_WEIGHT = 0.20;
  const TAM_WEIGHT = 0.40;

  return Math.round(
    signalNorm * SIGNAL_WEIGHT +
    emailNorm * EMAIL_WEIGHT +
    tamNorm * TAM_WEIGHT
  );
}
