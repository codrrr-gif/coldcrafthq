// ============================================
// Email Verification Pipeline — Orchestrator
// ============================================
// Runs an email through all 6 layers in sequence, short-circuiting
// when an early layer produces a definitive verdict.
//
// Flow:
// 1. Syntax (local) → invalid syntax = stop
// 2. DNS (local) → no MX / disposable = stop
// 3. SMTP via Reacher (VPS) → mailbox check + catch-all
// 4. Risk Score (local) → aggregate all signals
// 5. AI Analysis (optional) → edge cases only
//
// Layer 5 (catch-all) is folded into Layer 3 since Reacher
// handles catch-all detection natively via SMTP probing.

import { validateSyntax } from './syntax';
import { verifyDns } from './dns';
import { verifySmtp } from './reacher';
import { calculateRiskScore } from './risk-score';
import { getCachedDomain, cacheDomain, getMemoryCached, setMemoryCached } from './cache';
import { getHistoricalSignal } from './outcomes-db';
import { runExternalVerification } from './external-verify';
import type {
  VerificationResult,
  VerificationVerdict,
  InvalidReason,
  RiskyReason,
  DnsResult,
  SmtpResult,
  CatchAllResult,
  PipelineConfig,
} from './types';

export async function verifyEmail(
  email: string,
  config?: Partial<PipelineConfig>
): Promise<VerificationResult> {
  const startTime = Date.now();
  const normalizedEmail = email.trim().toLowerCase();

  // Layer 1: Syntax
  const syntax = validateSyntax(normalizedEmail);

  if (!syntax.valid) {
    return buildResult(normalizedEmail, 'invalid', 'syntax_error', startTime, {
      syntax,
      dns: null,
      smtp: null,
      catch_all: null,
      score: 0,
    });
  }

  // If typo detected, mark invalid with suggestion
  if (syntax.has_typo) {
    return buildResult(normalizedEmail, 'invalid', 'typo_detected', startTime, {
      syntax,
      dns: null,
      smtp: null,
      catch_all: null,
      score: 0,
      suggested_correction: `${syntax.local_part}@${syntax.suggested_domain}`,
    });
  }

  // Layer 0: Historical signal lookup (our own bounce database)
  // Runs after syntax but before DNS/SMTP to short-circuit expensive checks.
  const historical = await getHistoricalSignal(normalizedEmail);
  if (historical.has_signal && historical.verdict && historical.score_override !== null) {
    const riskAnalysis = calculateRiskScore(syntax, null, null, null);
    riskAnalysis.score = historical.score_override;

    return {
      email: normalizedEmail,
      verdict: historical.verdict,
      risk: historical.verdict === 'invalid' ? 'critical'
          : historical.verdict === 'valid'   ? 'low'
          : 'high',
      score: historical.score_override,
      reason: historical.reason as InvalidReason | RiskyReason | null,
      syntax,
      dns: null,
      smtp: null,
      catch_all: null,
      risk_analysis: riskAnalysis,
      ai_analysis: null,
      suggested_correction: null,
      verified_at: new Date().toISOString(),
      verification_time_ms: Date.now() - startTime,
    };
  }

  // Layer 2: DNS
  let dns: DnsResult | null = null;

  // Check memory cache first (same request lifecycle)
  const memoryCached = getMemoryCached(syntax.domain);
  if (memoryCached) {
    dns = {
      has_mx: memoryCached.has_mx,
      mx_records: memoryCached.mx_records.map((r) => ({ exchange: r, priority: 0 })),
      has_spf: false,
      has_dmarc: false,
      provider: memoryCached.provider,
      is_disposable: memoryCached.is_disposable,
      is_parked: false,
      accepts_mail: memoryCached.has_mx,
    };
  } else {
    // Check Supabase cache
    const cached = await getCachedDomain(syntax.domain);
    if (cached) {
      dns = {
        has_mx: cached.has_mx,
        mx_records: cached.mx_records.map((r) => ({ exchange: r, priority: 0 })),
        has_spf: false,
        has_dmarc: false,
        provider: cached.provider,
        is_disposable: cached.is_disposable,
        is_parked: false,
        accepts_mail: cached.has_mx,
      };
    } else {
      dns = await verifyDns(syntax.domain);

      // Cache the result
      const cacheEntry = {
        domain: syntax.domain,
        has_mx: dns.has_mx,
        mx_records: dns.mx_records.map((r) => r.exchange),
        is_catch_all: null,
        is_disposable: dns.is_disposable,
        provider: dns.provider,
        ttl_hours: 24,
      };
      setMemoryCached({ ...cacheEntry, checked_at: new Date().toISOString() });
      cacheDomain(cacheEntry).catch(console.error);
    }
  }

  // Short-circuit: no MX records
  if (!dns.has_mx) {
    return buildResult(normalizedEmail, 'invalid', 'no_mx_records', startTime, {
      syntax, dns, smtp: null, catch_all: null, score: 0,
    });
  }

  // Short-circuit: disposable domain
  if (dns.is_disposable) {
    return buildResult(normalizedEmail, 'invalid', 'disposable_domain', startTime, {
      syntax, dns, smtp: null, catch_all: null, score: 0,
    });
  }

  // Short-circuit: parked domain
  if (dns.is_parked) {
    return buildResult(normalizedEmail, 'invalid', 'domain_not_found', startTime, {
      syntax, dns, smtp: null, catch_all: null, score: 0,
    });
  }

  // Layer 3 + 4: SMTP + Catch-All (via Reacher on VPS)
  let smtp: SmtpResult | null = null;
  let catchAll: CatchAllResult | null = null;

  if (!config?.skip_smtp) {
    try {
      const smtpResult = await verifySmtp(normalizedEmail);
      smtp = smtpResult.smtp;
      catchAll = smtpResult.catch_all;

      // Update domain cache with catch-all info
      if (catchAll.is_catch_all) {
        const cached = getMemoryCached(syntax.domain);
        if (cached) {
          setMemoryCached({ ...cached, is_catch_all: true });
        }
      }

      // Short-circuit: SMTP definitively rejected
      if (smtp.connectable && !smtp.mailbox_exists && !smtp.is_catch_all && !smtp.greylisted) {
        return buildResult(normalizedEmail, 'invalid', 'mailbox_not_found', startTime, {
          syntax, dns, smtp, catch_all: catchAll, score: 5,
        });
      }
    } catch (err) {
      console.error('SMTP verification failed:', err);
      // Continue without SMTP — DNS-only verification
    }
  }

  // Layer 5: Risk Score
  const riskAnalysis = calculateRiskScore(syntax, dns, smtp, catchAll);

  // Determine final verdict
  let verdict: VerificationVerdict;
  let reason: InvalidReason | RiskyReason | null = null;

  if (riskAnalysis.score >= 80) {
    verdict = 'valid';
  } else if (riskAnalysis.score >= 50) {
    verdict = 'risky';
    // Pick the primary risky reason
    if (riskAnalysis.is_catch_all) reason = 'catch_all';
    else if (riskAnalysis.is_role_based) reason = 'role_based';
    else if (riskAnalysis.is_free_provider) reason = 'free_provider';
    else if (smtp?.greylisted) reason = 'greylisted';
    else reason = 'low_score';
  } else if (riskAnalysis.score >= 20) {
    verdict = 'risky';
    reason = 'low_score';
  } else {
    verdict = 'invalid';
    if (smtp && !smtp.mailbox_exists) reason = 'mailbox_not_found';
    else reason = 'smtp_rejected';
  }

  // If SMTP was skipped and there are no risky signals, mark unknown
  // (can't confirm mailbox exists without SMTP probe)
  const hasRiskySignal =
    riskAnalysis.is_role_based ||
    riskAnalysis.is_free_provider ||
    riskAnalysis.is_catch_all ||
    riskAnalysis.is_disposable;

  if (!smtp && !hasRiskySignal && dns.has_mx && riskAnalysis.score >= 40 && riskAnalysis.score < 75) {
    verdict = 'unknown';
    reason = null;
  }

  // Layer 3.5: External verification — only for catch-all or unknown
  // Calls MillionVerifier (cheap) and optionally FindyMail (premium).
  // Results are also recorded in our historical DB to build our own dataset.
  const needsExternalVerify =
    verdict === 'unknown' ||
    (verdict === 'risky' && riskAnalysis.is_catch_all);

  const useExternal =
    needsExternalVerify &&
    ((config?.use_million_verifier ?? !!process.env.MILLIONVERIFIER_API_KEY) ||
     (config?.use_findymail ?? !!process.env.FINDYMAIL_API_KEY));

  if (useExternal && needsExternalVerify) {
    const extResult = await runExternalVerification(
      normalizedEmail,
      config?.use_million_verifier ?? !!process.env.MILLIONVERIFIER_API_KEY,
      config?.use_findymail ?? !!process.env.FINDYMAIL_API_KEY,
    );

    if (extResult) {
      // Blend the external result into our score
      riskAnalysis.score = Math.max(0, Math.min(100,
        riskAnalysis.score + extResult.score_adjustment
      ));

      // Override verdict if external gave a definitive answer
      if (extResult.verdict === 'valid') {
        verdict = 'valid';
        reason = null;
      } else if (extResult.verdict === 'invalid') {
        verdict = 'invalid';
        reason = 'smtp_rejected';
        riskAnalysis.score = 0;
      } else if (extResult.verdict === 'risky' && verdict === 'unknown') {
        verdict = 'risky';
        reason = 'catch_all';
      }
    }
  }

  return buildResult(normalizedEmail, verdict, reason, startTime, {
    syntax,
    dns,
    smtp,
    catch_all: catchAll,
    score: riskAnalysis.score,
    riskAnalysis,
  });
}

// --- Bulk verification helper ---

export async function verifyEmailBatch(
  emails: string[],
  config?: Partial<PipelineConfig>
): Promise<VerificationResult[]> {
  // Group by domain for cache efficiency
  const byDomain = new Map<string, string[]>();
  for (const email of emails) {
    const domain = email.split('@')[1]?.toLowerCase() || '';
    const existing = byDomain.get(domain) || [];
    existing.push(email);
    byDomain.set(domain, existing);
  }

  const results: VerificationResult[] = [];
  const concurrency = config?.concurrency || 5;

  // Process domain groups with concurrency limit
  const domainGroups = Array.from(byDomain.values());
  for (let i = 0; i < domainGroups.length; i += concurrency) {
    const batch = domainGroups.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (domainEmails) => {
        const domainResults: VerificationResult[] = [];
        for (const email of domainEmails) {
          const result = await verifyEmail(email, config);
          domainResults.push(result);
        }
        return domainResults;
      })
    );
    results.push(...batchResults.flat());
  }

  return results;
}

// --- Result builder ---

interface BuildResultOptions {
  syntax: VerificationResult['syntax'];
  dns: VerificationResult['dns'];
  smtp: VerificationResult['smtp'];
  catch_all: VerificationResult['catch_all'];
  score: number;
  riskAnalysis?: VerificationResult['risk_analysis'];
  suggested_correction?: string;
}

function buildResult(
  email: string,
  verdict: VerificationVerdict,
  reason: InvalidReason | RiskyReason | null,
  startTime: number,
  opts: BuildResultOptions
): VerificationResult {
  const riskAnalysis = opts.riskAnalysis || calculateRiskScore(
    opts.syntax,
    opts.dns,
    opts.smtp,
    opts.catch_all
  );

  return {
    email,
    verdict,
    risk: riskAnalysis.level,
    score: opts.score,
    reason,
    syntax: opts.syntax,
    dns: opts.dns,
    smtp: opts.smtp,
    catch_all: opts.catch_all,
    risk_analysis: riskAnalysis,
    ai_analysis: null,
    suggested_correction: opts.suggested_correction || null,
    verified_at: new Date().toISOString(),
    verification_time_ms: Date.now() - startTime,
  };
}
