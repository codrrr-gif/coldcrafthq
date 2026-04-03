// src/lib/finder/index.ts
// ============================================
// Email Finder — the core engine.
//
// Order of operations:
// 1. Check domain_patterns cache (instant if confidence >= 60)
// 2. SMTP permutation loop via Reacher
// 3. If catch-all detected: return most-probable pattern (unconfirmed)
// ============================================

import { generatePermutations, applyPattern } from './permutations';
import { getCachedPattern, updateDomainPattern } from './patterns';
import { verifyEmail } from '@/lib/verify/pipeline';
import type { FinderResult } from '@/lib/gtm/types';

// Step 0c: Apollo.io email lookup — large B2B contact database
async function findEmailWithApollo(
  firstName: string,
  lastName: string,
  domain: string,
): Promise<string | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.apollo.io/api/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        organization_domain: domain,
        reveal_personal_emails: false,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const email = data?.person?.email;
    if (email) return email.toLowerCase();
  } catch {
    // Network error or timeout
  }

  return null;
}

// Step 0b: Hunter.io lookup — finds email by name + domain (fallback to FindyMail)
async function findEmailWithHunter(
  firstName: string,
  lastName: string,
  domain: string,
): Promise<string | null> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({
      domain,
      first_name: firstName,
      last_name: lastName,
      api_key: apiKey,
    });
    const res = await fetch(`https://api.hunter.io/v2/email-finder?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const email: string | undefined = data?.data?.email;
    const score: number = data?.data?.score ?? 0;

    // Hunter returns a confidence score 0-100; only trust >= 60
    if (email && score >= 60) return email.toLowerCase();
  } catch {
    // Network error or timeout — fall through
  }

  return null;
}

// Step 0a: FindyMail lookup — finds email by name + domain directly (when key is set)
async function findEmailWithFindyMail(
  firstName: string,
  lastName: string,
  domain: string,
): Promise<string | null> {
  const apiKey = process.env.FINDYMAIL_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://app.findymail.com/api/search/name', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ name: `${firstName} ${lastName}`, domain }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const email: string | undefined =
      data?.contact?.email || data?.email || undefined;

    if (email) return email.toLowerCase();
  } catch {
    // Network error or timeout — fall through to SMTP
  }

  return null;
}

export async function findEmail(
  firstName: string,
  lastName: string,
  domain: string,
): Promise<FinderResult> {
  const triedPatterns: string[] = [];
  let findymailAttempted = false;

  // Step 0: FindyMail lookup — highest accuracy, try before SMTP guessing
  const findymailEmail = await findEmailWithFindyMail(firstName, lastName, domain);
  if (findymailEmail) {
    findymailAttempted = true;
    triedPatterns.push(findymailEmail);
    const result = await verifyEmail(findymailEmail, {
      use_million_verifier: false,
      use_findymail: false,
    });
    if (result.verdict === 'valid' || result.verdict === 'risky') {
      await updateDomainPattern(findymailEmail, firstName, lastName);
      return {
        email: findymailEmail,
        found: true,
        pattern: null,
        found_via: 'external',
        verdict: result.verdict,
        score: result.score,
        tried_patterns: triedPatterns,
      };
    }
  }

  // Step 0b: Hunter.io fallback — try if FindyMail missed or unavailable
  let hunterEmail: string | null = null;
  if (!findymailEmail) {
    hunterEmail = await findEmailWithHunter(firstName, lastName, domain);
    if (hunterEmail) {
      triedPatterns.push(hunterEmail);
      const result = await verifyEmail(hunterEmail, {
        use_million_verifier: false,
        use_findymail: false,
      });
      if (result.verdict === 'valid' || result.verdict === 'risky') {
        await updateDomainPattern(hunterEmail, firstName, lastName);
        return {
          email: hunterEmail,
          found: true,
          pattern: null,
          found_via: 'hunter',
          verdict: result.verdict,
          score: result.score,
          tried_patterns: triedPatterns,
        };
      }
    }
  }

  // Step 0c: Apollo.io fallback — large B2B database
  if (!findymailEmail && !hunterEmail) {
    const apolloEmail = await findEmailWithApollo(firstName, lastName, domain);
    if (apolloEmail) {
      triedPatterns.push(apolloEmail);
      const result = await verifyEmail(apolloEmail, {
        use_million_verifier: false,
        use_findymail: false,
      });
      if (result.verdict === 'valid' || result.verdict === 'risky') {
        await updateDomainPattern(apolloEmail, firstName, lastName);
        return {
          email: apolloEmail,
          found: true,
          pattern: null,
          found_via: 'apollo' as FinderResult['found_via'],
          verdict: result.verdict,
          score: result.score,
          tried_patterns: triedPatterns,
        };
      }
    }
  }

  // Step 1: Check pattern cache — skip external APIs for speed
  const cached = await getCachedPattern(domain);
  if (cached) {
    const candidateEmail = applyPattern(cached.pattern, firstName, lastName, domain);
    if (candidateEmail) {
      triedPatterns.push(candidateEmail);
      const result = await verifyEmail(candidateEmail, {
        use_million_verifier: false,
        use_findymail: false,
      });
      if (result.verdict === 'valid') {
        await updateDomainPattern(candidateEmail, firstName, lastName);
        return {
          email: candidateEmail,
          found: true,
          pattern: cached.pattern,
          found_via: 'pattern_cache',
          verdict: result.verdict,
          score: result.score,
          tried_patterns: triedPatterns,
        };
      }
    }
  }

  // Step 2: SMTP permutation loop
  const permutations = generatePermutations(firstName, lastName, domain);
  let isCatchAll = false;

  for (const candidate of permutations) {
    if (triedPatterns.includes(candidate)) continue;
    triedPatterns.push(candidate);

    const result = await verifyEmail(candidate, {
      use_million_verifier: false,
      use_findymail: false,
    });

    // Catch-all detected — SMTP can't distinguish individual mailboxes
    if (result.catch_all?.is_catch_all) {
      isCatchAll = true;
      break;
    }

    if (result.verdict === 'valid') {
      await updateDomainPattern(candidate, firstName, lastName);
      return {
        email: candidate,
        found: true,
        pattern: null,
        found_via: 'smtp_permutation',
        verdict: result.verdict,
        score: result.score,
        tried_patterns: triedPatterns,
      };
    }

    // Definitive rejection — mailbox confirmed absent
    if (result.verdict === 'invalid' && result.reason === 'mailbox_not_found') {
      continue;
    }
  }

  // Step 3: Catch-all domain — try FindyMail fallback, else return most probable unconfirmed
  if (isCatchAll) {
    // Only call FindyMail if we haven't already tried it in Step 0
    if (!findymailAttempted && process.env.FINDYMAIL_API_KEY) {
      const catchAllEmail = await findEmailWithFindyMail(firstName, lastName, domain);
      if (catchAllEmail) {
        if (!triedPatterns.includes(catchAllEmail)) triedPatterns.push(catchAllEmail);
        const result = await verifyEmail(catchAllEmail, {
          use_million_verifier: false,
          use_findymail: false,
        });
        if (result.verdict === 'valid' || result.verdict === 'risky') {
          await updateDomainPattern(catchAllEmail, firstName, lastName);
          return {
            email: catchAllEmail,
            found: true,
            pattern: null,
            found_via: 'findymail_catchall',
            verdict: result.verdict,
            score: result.score,
            tried_patterns: triedPatterns,
          };
        }
      }
    }

    // FindyMail unavailable, already tried, or returned nothing — fall back to best guess
    const mostProbable = permutations[0];
    return {
      email: mostProbable,
      found: false,
      pattern: null,
      found_via: null,
      verdict: 'unknown',
      score: null,
      tried_patterns: triedPatterns,
    };
  }

  return {
    email: null,
    found: false,
    pattern: null,
    found_via: null,
    verdict: null,
    score: null,
    tried_patterns: triedPatterns,
  };
}
