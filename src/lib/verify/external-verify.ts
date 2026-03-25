// ============================================
// Layer 3.5: External Verification
// ============================================
// Called only for catch-all and unknown emails — the cases our
// SMTP layer can't resolve definitively. Uses MillionVerifier
// (bulk, cheap) and optionally FindyMail (precision, expensive).
//
// Critically: every result feeds back into our email_outcomes
// table, seeding our historical database until organic data
// from real sends makes external APIs unnecessary.

import { recordEmailOutcome } from './outcomes-db';
import type { OutcomeType } from './outcomes-db';

// MillionVerifier result codes
const MV_RESULT_CODES: Record<number, string> = {
  1:  'ok',
  2:  'catch_all',
  3:  'unknown',
  5:  'invalid',
  6:  'disposable',
  7:  'mailbox_full',
  10: 'role_based',
};

export type ExternalVerdictType = 'valid' | 'invalid' | 'risky' | 'unknown';

export interface ExternalVerifyResult {
  source: 'millionverifier' | 'findymail';
  verdict: ExternalVerdictType;
  confidence: number;   // 0-100
  raw_result: string;   // raw result string from the API
  score_adjustment: number;
}

// ============================================
// MillionVerifier
// ============================================

export async function verifyWithMillionVerifier(
  email: string
): Promise<ExternalVerifyResult | null> {
  const apiKey = process.env.MILLIONVERIFIER_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://api.millionverifier.com/api/v3/?api=${apiKey}&email=${encodeURIComponent(email)}&timeout=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const data = await res.json();
    const resultCode: number = data.resultcode || 0;
    const rawResult: string = data.result || MV_RESULT_CODES[resultCode] || 'unknown';

    let verdict: ExternalVerdictType;
    let confidence: number;
    let scoreAdjustment: number;
    let outcomeToRecord: OutcomeType | null = null;

    switch (resultCode) {
      case 1: // ok — deliverable
        verdict = 'valid';
        confidence = 92;
        scoreAdjustment = +20;
        outcomeToRecord = 'delivered';
        break;
      case 2: // catch_all
        verdict = 'risky';
        confidence = 70;
        scoreAdjustment = -5; // already flagged, slight nudge
        outcomeToRecord = null; // catch_all isn't a definitive bounce
        break;
      case 5: // invalid
        verdict = 'invalid';
        confidence = 95;
        scoreAdjustment = -50;
        outcomeToRecord = 'hard_bounce';
        break;
      case 6: // disposable
        verdict = 'invalid';
        confidence = 99;
        scoreAdjustment = -50;
        outcomeToRecord = 'hard_bounce';
        break;
      case 7: // mailbox full
        verdict = 'risky';
        confidence = 75;
        scoreAdjustment = -15;
        outcomeToRecord = 'soft_bounce';
        break;
      case 10: // role-based
        verdict = 'risky';
        confidence = 85;
        scoreAdjustment = -10;
        outcomeToRecord = null;
        break;
      default: // unknown (3) or anything else
        verdict = 'unknown';
        confidence = 40;
        scoreAdjustment = 0;
        outcomeToRecord = null;
    }

    // Feed result into our historical database
    if (outcomeToRecord) {
      recordEmailOutcome(email, outcomeToRecord, {
        source: 'millionverifier',
      }).catch(console.error);
    }

    return {
      source: 'millionverifier',
      verdict,
      confidence,
      raw_result: rawResult,
      score_adjustment: scoreAdjustment,
    };
  } catch (err) {
    console.error('MillionVerifier error:', err);
    return null;
  }
}

// ============================================
// FindyMail
// ============================================

export async function verifyWithFindyMail(
  email: string
): Promise<ExternalVerifyResult | null> {
  const apiKey = process.env.FINDYMAIL_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://app.findymail.com/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const status: string = data.email?.status || data.status || 'unknown';
    const confidence: number = data.email?.confidence || data.confidence || 50;

    let verdict: ExternalVerdictType;
    let scoreAdjustment: number;
    let outcomeToRecord: OutcomeType | null = null;

    if (status === 'valid' && confidence >= 80) {
      verdict = 'valid';
      scoreAdjustment = +25;
      outcomeToRecord = 'delivered';
    } else if (status === 'valid') {
      verdict = 'valid';
      scoreAdjustment = +15;
      outcomeToRecord = 'delivered';
    } else if (status === 'invalid') {
      verdict = 'invalid';
      scoreAdjustment = -50;
      outcomeToRecord = 'hard_bounce';
    } else if (status === 'risky') {
      verdict = 'risky';
      scoreAdjustment = -10;
      outcomeToRecord = null;
    } else {
      verdict = 'unknown';
      scoreAdjustment = 0;
      outcomeToRecord = null;
    }

    // Feed into our historical database
    if (outcomeToRecord) {
      recordEmailOutcome(email, outcomeToRecord, {
        source: 'findymail',
      }).catch(console.error);
    }

    return {
      source: 'findymail',
      verdict,
      confidence,
      raw_result: status,
      score_adjustment: scoreAdjustment,
    };
  } catch (err) {
    console.error('FindyMail error:', err);
    return null;
  }
}

// ============================================
// Combined external check
// ============================================
// Calls MillionVerifier first (cheap). If still uncertain
// and FindyMail is enabled, calls FindyMail (premium).

export async function runExternalVerification(
  email: string,
  useMillionVerifier: boolean,
  useFindymail: boolean,
): Promise<ExternalVerifyResult | null> {
  if (useMillionVerifier) {
    const mvResult = await verifyWithMillionVerifier(email);
    if (mvResult) {
      // If MV gave a definitive answer, skip FindyMail
      if (mvResult.verdict === 'valid' || mvResult.verdict === 'invalid') {
        return mvResult;
      }
      // Still catch_all/unknown — try FindyMail if enabled
      if (useFindymail) {
        const fmResult = await verifyWithFindyMail(email);
        return fmResult || mvResult;
      }
      return mvResult;
    }
  }

  if (useFindymail) {
    return verifyWithFindyMail(email);
  }

  return null;
}
