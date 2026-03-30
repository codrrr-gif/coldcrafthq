// src/lib/enrichment/campaign-mapper.ts
// ============================================
// Maps signal types to Instantly campaign IDs.
// Configure via env vars — keeps campaign IDs out of code.
// ============================================

import type { SignalType } from '@/lib/gtm/types';

export function getCampaignId(signalType: SignalType): string | null {
  const mapping: Record<SignalType, string | undefined> = {
    funding: process.env.CAMPAIGN_ID_FUNDING,
    job_posting: process.env.CAMPAIGN_ID_JOB_POSTING,
    leadership_change: process.env.CAMPAIGN_ID_LEADERSHIP,
    news: process.env.CAMPAIGN_ID_NEWS,
    intent: process.env.CAMPAIGN_ID_INTENT,
    tech_stack: process.env.CAMPAIGN_ID_TECH_STACK,
    competitor_review: process.env.CAMPAIGN_ID_COMPETITOR,
    job_change: process.env.CAMPAIGN_ID_JOB_CHANGE,
  };
  return mapping[signalType] || process.env.CAMPAIGN_ID_DEFAULT || null;
}
