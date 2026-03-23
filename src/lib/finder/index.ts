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

export async function findEmail(
  firstName: string,
  lastName: string,
  domain: string,
): Promise<FinderResult> {
  const triedPatterns: string[] = [];

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

  // Step 3: Catch-all domain — return most probable pattern unconfirmed
  if (isCatchAll) {
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
