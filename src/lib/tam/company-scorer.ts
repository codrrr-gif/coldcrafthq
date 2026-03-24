// src/lib/tam/company-scorer.ts
// Scores a company 0-100 based on ICP fit. Higher = better = Tier 1.

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
