// ============================================
// Email Outcomes DB — Historical Bounce Data
// ============================================
// Records send outcomes and provides lookups for Layer 0
// of the verification pipeline. Grows over time with every send.

import { supabase } from '@/lib/supabase/client';

export type OutcomeType = 'hard_bounce' | 'soft_bounce' | 'replied' | 'delivered';

export interface EmailOutcome {
  email: string;
  outcome: OutcomeType;
  recorded_at: string;
  bounce_message: string | null;
  bounce_code: string | null;
}

export interface DomainOutcomeStats {
  domain: string;
  total: number;
  hard_bounces: number;
  replies: number;
  soft_bounces: number;
  bounce_rate: number;  // hard_bounces / total
  reply_rate: number;   // replies / total
}

// --- Record a single outcome ---

export async function recordEmailOutcome(
  email: string,
  outcome: OutcomeType,
  options?: {
    campaign_id?: string;
    bounce_message?: string;
    bounce_code?: string;
    source?: string;
  }
): Promise<void> {
  const domain = email.split('@')[1]?.toLowerCase() || '';

  try {
    await supabase.from('email_outcomes').insert({
      email: email.toLowerCase(),
      domain,
      outcome,
      source: options?.source || 'instantly',
      campaign_id: options?.campaign_id || null,
      bounce_message: options?.bounce_message || null,
      bounce_code: options?.bounce_code || null,
    });
  } catch (err) {
    console.error('Failed to record email outcome:', err);
  }
}

// --- Layer 0 lookup ---
// Returns the most relevant historical signal for an email.
// Called before DNS/SMTP to short-circuit expensive checks.

export interface HistoricalSignal {
  has_signal: boolean;
  verdict: 'invalid' | 'valid' | 'risky' | null;
  reason: string | null;
  score_override: number | null;
  most_recent_outcome: OutcomeType | null;
  outcome_age_days: number | null;
  domain_stats: DomainOutcomeStats | null;
}

const HARD_BOUNCE_EXPIRY_DAYS = 180;  // Re-verify hard bounces after 6 months (people change jobs)
const REPLY_VALIDITY_DAYS = 90;       // Replies older than 90 days are weaker signal

export async function getHistoricalSignal(email: string): Promise<HistoricalSignal> {
  const normalizedEmail = email.toLowerCase();
  const domain = normalizedEmail.split('@')[1] || '';

  try {
    // Get the most recent outcome for this specific email
    const { data: outcomes } = await supabase
      .from('email_outcomes')
      .select('outcome, recorded_at, bounce_message, bounce_code')
      .eq('email', normalizedEmail)
      .order('recorded_at', { ascending: false })
      .limit(5);

    // Get domain-level stats for catch-all resolution
    const { data: domainRows } = await supabase
      .from('email_outcomes')
      .select('outcome')
      .eq('domain', domain)
      .limit(500);

    const domainStats = buildDomainStats(domain, domainRows || []);

    if (!outcomes?.length) {
      return {
        has_signal: false,
        verdict: null,
        reason: null,
        score_override: null,
        most_recent_outcome: null,
        outcome_age_days: null,
        domain_stats: domainStats.total > 0 ? domainStats : null,
      };
    }

    const latest = outcomes[0];
    const ageDays = Math.floor(
      (Date.now() - new Date(latest.recorded_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Hard bounce — definitive invalid (within expiry window)
    if (latest.outcome === 'hard_bounce' && ageDays < HARD_BOUNCE_EXPIRY_DAYS) {
      return {
        has_signal: true,
        verdict: 'invalid',
        reason: 'known_hard_bounce',
        score_override: 0,
        most_recent_outcome: 'hard_bounce',
        outcome_age_days: ageDays,
        domain_stats: domainStats.total > 0 ? domainStats : null,
      };
    }

    // Replied — strongest valid signal
    if (latest.outcome === 'replied') {
      const score = ageDays < REPLY_VALIDITY_DAYS ? 98 : 85;
      return {
        has_signal: true,
        verdict: 'valid',
        reason: 'known_replied',
        score_override: score,
        most_recent_outcome: 'replied',
        outcome_age_days: ageDays,
        domain_stats: domainStats.total > 0 ? domainStats : null,
      };
    }

    // Soft bounce — risky, likely temporary
    if (latest.outcome === 'soft_bounce') {
      return {
        has_signal: true,
        verdict: 'risky',
        reason: 'known_soft_bounce',
        score_override: 35,
        most_recent_outcome: 'soft_bounce',
        outcome_age_days: ageDays,
        domain_stats: domainStats.total > 0 ? domainStats : null,
      };
    }

    return {
      has_signal: false,
      verdict: null,
      reason: null,
      score_override: null,
      most_recent_outcome: latest.outcome as OutcomeType,
      outcome_age_days: ageDays,
      domain_stats: domainStats.total > 0 ? domainStats : null,
    };
  } catch (err) {
    console.error('Historical signal lookup failed:', err);
    return {
      has_signal: false,
      verdict: null,
      reason: null,
      score_override: null,
      most_recent_outcome: null,
      outcome_age_days: null,
      domain_stats: null,
    };
  }
}

function buildDomainStats(
  domain: string,
  rows: { outcome: string }[]
): DomainOutcomeStats {
  const total = rows.length;
  const hard_bounces = rows.filter((r) => r.outcome === 'hard_bounce').length;
  const replies = rows.filter((r) => r.outcome === 'replied').length;
  const soft_bounces = rows.filter((r) => r.outcome === 'soft_bounce').length;

  return {
    domain,
    total,
    hard_bounces,
    replies,
    soft_bounces,
    bounce_rate: total > 0 ? hard_bounces / total : 0,
    reply_rate: total > 0 ? replies / total : 0,
  };
}
