// src/lib/tam/company-scorer.ts
// Scores a company 0-100 based on ICP fit. Higher = better = Tier 1.
// scoreCompany: sync, hardcoded defaults (used in discovery batch runs)
// scoreCompanyAsync: reads learned weights from DB, falls back to sync version

import { supabase } from '@/lib/supabase/client';

interface ScoringInput {
  industry?: string;
  headcount_range?: string;
  funding_stage?: string;
  location?: string;
}

const ICP_INDUSTRIES = ['software', 'saas', 'technology', 'fintech', 'martech', 'sales', 'marketing', 'tech'];
const ICP_HEADCOUNT = ['11-50', '51-200', '201-500'];
const ICP_FUNDING = ['seed', 'series_a', 'series_b', 'series_c'];
const ICP_LOCATIONS = ['us', 'usa', 'united states', 'united kingdom', 'canada', 'australia'];

export function scoreCompany(company: ScoringInput): number {
  let score = 40; // base

  if (company.industry) {
    const ind = company.industry.toLowerCase();
    if (ICP_INDUSTRIES.some((i) => ind.includes(i))) score += 20;
  }

  if (company.headcount_range && ICP_HEADCOUNT.includes(company.headcount_range)) {
    score += 15;
  }

  if (company.funding_stage && ICP_FUNDING.includes(company.funding_stage)) {
    score += 15;
  }

  if (company.location) {
    const loc = company.location.toLowerCase();
    if (ICP_LOCATIONS.some((l) => loc.includes(l))) score += 10;
  }

  return Math.min(score, 100);
}

// Dynamic scoring using learned ICP weights from the DB.
export async function scoreCompanyAsync(company: ScoringInput): Promise<number> {
  try {
    const { data: weights } = await supabase
      .from('learning_weights')
      .select('weight_type, dimension_value, learned_score')
      .in('weight_type', ['icp_industry', 'icp_headcount', 'icp_funding']);

    if (!weights?.length) return scoreCompany(company);

    const lookup = (type: string, value: string): number | null => {
      const row = weights.find(
        (w) => w.weight_type === type && w.dimension_value === value.toLowerCase()
      );
      return row?.learned_score ?? null;
    };

    let score = 40;

    if (company.industry) {
      const ind = company.industry.toLowerCase();
      // Try exact match first, then substring
      const learned = weights
        .filter((w) => w.weight_type === 'icp_industry' && ind.includes(w.dimension_value))
        .sort((a, b) => b.learned_score - a.learned_score)[0];
      score += learned?.learned_score ?? (ICP_INDUSTRIES.some((i) => ind.includes(i)) ? 20 : 0);
    }

    if (company.headcount_range) {
      const learned = lookup('icp_headcount', company.headcount_range);
      score += learned ?? (ICP_HEADCOUNT.includes(company.headcount_range) ? 15 : 0);
    }

    if (company.funding_stage) {
      const learned = lookup('icp_funding', company.funding_stage);
      score += learned ?? (ICP_FUNDING.includes(company.funding_stage) ? 15 : 0);
    }

    if (company.location) {
      const loc = company.location.toLowerCase();
      if (ICP_LOCATIONS.some((l) => loc.includes(l))) score += 10;
    }

    return Math.min(score, 100);
  } catch {
    return scoreCompany(company);
  }
}
