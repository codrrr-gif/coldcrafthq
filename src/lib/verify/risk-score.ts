// ============================================
// Layer 5: Risk Scoring Engine
// ============================================
// Aggregates all layer results into a 0-100 deliverability score
// and a send recommendation. This is the brain of the system.

import type {
  SyntaxResult,
  DnsResult,
  SmtpResult,
  CatchAllResult,
  RiskAnalysis,
  RiskFactor,
  RiskLevel,
  SendRecommendation,
} from './types';

export function calculateRiskScore(
  syntax: SyntaxResult,
  dns: DnsResult | null,
  smtp: SmtpResult | null,
  catchAll: CatchAllResult | null
): RiskAnalysis {
  const factors: RiskFactor[] = [];
  let score = 50; // Start neutral

  // --- Syntax factors ---
  if (!syntax.valid) {
    factors.push({ factor: 'invalid_syntax', impact: -50, description: 'Email has invalid syntax' });
    score -= 50;
  }

  if (syntax.has_typo) {
    factors.push({ factor: 'domain_typo', impact: -40, description: `Likely typo — did you mean ${syntax.suggested_domain}?` });
    score -= 40;
  }

  if (syntax.is_role_based) {
    factors.push({ factor: 'role_based', impact: -15, description: 'Role-based address (info@, admin@, etc.)' });
    score -= 15;
  }

  if (syntax.is_free_provider) {
    factors.push({ factor: 'free_provider', impact: -10, description: 'Free email provider (not a business domain)' });
    score -= 10;
  }

  // --- DNS factors ---
  if (dns) {
    if (!dns.has_mx) {
      factors.push({ factor: 'no_mx', impact: -50, description: 'Domain has no MX records — cannot receive email' });
      score -= 50;
    } else {
      factors.push({ factor: 'valid_mx', impact: 20, description: 'Domain has valid MX records' });
      score += 20;
    }

    if (dns.has_spf) {
      factors.push({ factor: 'has_spf', impact: 5, description: 'Domain has SPF record configured' });
      score += 5;
    }

    if (dns.has_dmarc) {
      factors.push({ factor: 'has_dmarc', impact: 5, description: 'Domain has DMARC record configured' });
      score += 5;
    }

    if (dns.is_disposable) {
      factors.push({ factor: 'disposable', impact: -50, description: 'Disposable/temporary email domain' });
      score -= 50;
    }

    if (dns.is_parked) {
      factors.push({ factor: 'parked_domain', impact: -40, description: 'Domain appears to be parked/inactive' });
      score -= 40;
    }
  }

  // --- SMTP factors ---
  if (smtp) {
    if (smtp.connectable && smtp.mailbox_exists) {
      factors.push({ factor: 'smtp_verified', impact: 20, description: 'SMTP verification confirmed mailbox exists' });
      score += 20;
    } else if (smtp.connectable && !smtp.mailbox_exists && !smtp.is_catch_all) {
      factors.push({ factor: 'mailbox_not_found', impact: -45, description: 'SMTP server rejected — mailbox does not exist' });
      score -= 45;
    }

    if (smtp.is_disabled) {
      factors.push({ factor: 'mailbox_disabled', impact: -40, description: 'Mailbox exists but is disabled' });
      score -= 40;
    }

    if (smtp.has_full_inbox) {
      factors.push({ factor: 'full_inbox', impact: -20, description: 'Mailbox is full — email will bounce' });
      score -= 20;
    }

    if (smtp.greylisted) {
      factors.push({ factor: 'greylisted', impact: -5, description: 'Server uses greylisting — delivery may be delayed' });
      score -= 5;
    }

    if (smtp.timeout) {
      factors.push({ factor: 'smtp_timeout', impact: -10, description: 'SMTP verification timed out — status uncertain' });
      score -= 10;
    }
  }

  // --- Catch-all factors ---
  const isCatchAll = catchAll?.is_catch_all || smtp?.is_catch_all || false;

  if (isCatchAll) {
    // Catch-all domains accept everything at SMTP level but may silently
    // discard. High-risk because we can't verify the specific mailbox.
    factors.push({ factor: 'catch_all', impact: -15, description: 'Catch-all domain — accepts any address, cannot verify specific mailbox' });
    score -= 15;
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine risk level
  const level = scoreToRiskLevel(score);
  const recommendation = scoreToRecommendation(score, syntax, dns, isCatchAll);

  return {
    score,
    level,
    factors,
    is_role_based: syntax.is_role_based,
    is_disposable: dns?.is_disposable || false,
    is_free_provider: syntax.is_free_provider,
    is_catch_all: isCatchAll,
    has_valid_mx: dns?.has_mx || false,
    recommendation,
  };
}

function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'low';
  if (score >= 60) return 'medium';
  if (score >= 30) return 'high';
  return 'critical';
}

function scoreToRecommendation(
  score: number,
  syntax: SyntaxResult,
  dns: DnsResult | null,
  isCatchAll: boolean
): SendRecommendation {
  // Hard blocks — never send
  if (!syntax.valid) return 'do_not_send';
  if (syntax.has_typo) return 'do_not_send';
  if (dns?.is_disposable) return 'do_not_send';
  if (!dns?.has_mx) return 'do_not_send';
  if (dns?.is_parked) return 'do_not_send';

  // Role-based: never worth sending cold email to info@, noreply@, admin@ etc.
  // They don't bounce but they don't reply either — spam trap risk.
  if (syntax.is_role_based) return 'do_not_send';

  // Free providers: not a business address — low-quality B2B lead
  if (syntax.is_free_provider) return 'send_with_caution';

  // Catch-all: can't verify mailbox — treat cautiously
  if (isCatchAll) return 'send_with_caution';

  // Score-based for everything else
  if (score >= 80) return 'safe_to_send';
  if (score >= 60) return 'safe_to_send';
  if (score >= 40) return 'send_with_caution';
  if (score >= 20) return 'manual_review';
  return 'do_not_send';
}
