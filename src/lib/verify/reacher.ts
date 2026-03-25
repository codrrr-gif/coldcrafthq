// ============================================
// Layer 3: Reacher SMTP Verification Client
// ============================================
// Calls the self-hosted Reacher instance on the VPS for SMTP-level
// verification (RCPT TO probe, catch-all detection, deliverability).
// Falls back gracefully if the VPS is unreachable.

import type { ReacherRequest, ReacherResponse, SmtpResult, CatchAllResult } from './types';

const REACHER_TIMEOUT_MS = 25000;
const VERIFY_FROM_EMAIL = 'verify@coldcrafthq.com';
const HELLO_NAME = 'mail.coldcrafthq.com';

function getReacherUrl(): string | null {
  return process.env.REACHER_API_URL || process.env.REACHER_URL || null;
}

export async function verifySmtp(email: string): Promise<{
  smtp: SmtpResult;
  catch_all: CatchAllResult;
  reacher_verdict: string;
}> {
  const reacherUrl = getReacherUrl();

  if (!reacherUrl) {
    return {
      smtp: {
        connectable: false,
        mailbox_exists: false,
        is_catch_all: false,
        is_disabled: false,
        has_full_inbox: false,
        smtp_code: null,
        smtp_message: null,
        greylisted: false,
        timeout: true,
      },
      catch_all: {
        is_catch_all: false,
        confidence: 0,
        method: 'reacher',
      },
      reacher_verdict: 'unknown',
    };
  }

  const body: ReacherRequest = {
    to_email: email,
    from_email: VERIFY_FROM_EMAIL,
    hello_name: HELLO_NAME,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REACHER_TIMEOUT_MS);

  try {
    const response = await fetch(`${reacherUrl}/v0/check_email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.REACHER_API_KEY && { 'Authorization': `Bearer ${process.env.REACHER_API_KEY}` }),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Reacher returned ${response.status}`);
    }

    const data: ReacherResponse = await response.json();
    return parseReacherResponse(data);
  } catch (err) {
    clearTimeout(timeoutId);

    const isTimeout = err instanceof Error && err.name === 'AbortError';

    return {
      smtp: {
        connectable: false,
        mailbox_exists: false,
        is_catch_all: false,
        is_disabled: false,
        has_full_inbox: false,
        smtp_code: null,
        smtp_message: isTimeout ? 'Reacher timeout' : (err instanceof Error ? err.message : 'Unknown error'),
        greylisted: false,
        timeout: isTimeout,
      },
      catch_all: {
        is_catch_all: false,
        confidence: 0,
        method: 'reacher',
      },
      reacher_verdict: 'unknown',
    };
  }
}

function parseReacherResponse(data: ReacherResponse): {
  smtp: SmtpResult;
  catch_all: CatchAllResult;
  reacher_verdict: string;
} {
  const smtp: SmtpResult = {
    connectable: data.smtp.can_connect_smtp,
    mailbox_exists: data.smtp.is_deliverable,
    is_catch_all: data.smtp.is_catch_all,
    is_disabled: data.smtp.is_disabled,
    has_full_inbox: data.smtp.has_full_inbox,
    smtp_code: null,
    smtp_message: null,
    greylisted: false,
    timeout: false,
  };

  const catch_all: CatchAllResult = {
    is_catch_all: data.smtp.is_catch_all,
    confidence: data.smtp.is_catch_all ? 90 : 95,
    method: 'reacher',
  };

  return {
    smtp,
    catch_all,
    reacher_verdict: data.is_reachable,
  };
}

// Health check — verify Reacher is reachable before bulk jobs
export async function isReacherAvailable(): Promise<boolean> {
  const reacherUrl = getReacherUrl();
  if (!reacherUrl) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(reacherUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
