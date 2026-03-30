// ============================================
// Bulk Email Verification API
// ============================================
// POST /api/verify/bulk
// Body: { emails: string[] } or multipart form with CSV file
// Returns: { job_id, status, total_emails }
//
// Emails are queued in a verification_jobs row. The cron job
// picks up pending jobs and processes them in chunks.

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { parseCsvLeads, type CsvLead } from '@/lib/verify/csv-parser';
import { requireSecret, requireSession } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

const MAX_EMAILS_PER_JOB = 50000;

// Accept either session auth (dashboard) or secret auth (cron/API)
async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const authHeader = req.headers.get('authorization');
  if (authHeader) return requireSecret(req);
  return requireSession();
}

// SSRF protection: reject private/internal callback URLs
function isUnsafeCallbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow https
    if (parsed.protocol !== 'https:') return true;
    const hostname = parsed.hostname.toLowerCase();
    // Reject localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    // Reject private IP ranges
    const parts = hostname.split('.').map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
      // 10.x.x.x
      if (parts[0] === 10) return true;
      // 172.16-31.x.x
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      // 192.168.x.x
      if (parts[0] === 192 && parts[1] === 168) return true;
      // 169.254.x.x (link-local)
      if (parts[0] === 169 && parts[1] === 254) return true;
      // 127.x.x.x
      if (parts[0] === 127) return true;
    }
    return false;
  } catch {
    return true; // malformed URL = unsafe
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAuth(req);
  if (authErr) return authErr;

  try {
    let leads: CsvLead[] = [];
    let filename: string | null = null;
    let callbackUrl: string | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // CSV file upload — extracts email + name/company/niche metadata
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const emailColumn = (formData.get('email_column') as string) || 'email';
      callbackUrl = (formData.get('callback_url') as string) || null;

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      filename = file.name;
      const text = await file.text();
      leads = parseCsvLeads(text, emailColumn);
    } else {
      // JSON body — support both { emails: [] } and { leads: [] }
      const body = await req.json();
      if (body.leads) {
        leads = body.leads;
      } else if (body.emails) {
        leads = body.emails.map((e: string) => ({ email: e }));
      }
      callbackUrl = body.callback_url || null;
      filename = body.source_filename || null;
    }

    // SSRF protection on callback URL
    if (callbackUrl && isUnsafeCallbackUrl(callbackUrl)) {
      return NextResponse.json(
        { error: 'callback_url must be a public https:// URL' },
        { status: 400 }
      );
    }

    if (!leads.length) {
      return NextResponse.json(
        { error: 'No emails provided' },
        { status: 400 }
      );
    }

    // Deduplicate by email, keep first occurrence (preserves lead metadata)
    const seen = new Set<string>();
    const uniqueLeads = leads.filter((l) => {
      const email = l.email?.trim().toLowerCase();
      if (!email || !email.includes('@') || seen.has(email)) return false;
      seen.add(email);
      l.email = email;
      return true;
    });

    if (uniqueLeads.length > MAX_EMAILS_PER_JOB) {
      return NextResponse.json(
        { error: `Maximum ${MAX_EMAILS_PER_JOB} emails per job` },
        { status: 400 }
      );
    }

    // Create the job
    // NOTE: `callback_url` column (TEXT, nullable) must be added to
    // the `verification_jobs` table in Supabase before this field is persisted.
    const { data: job, error: jobError } = await supabase
      .from('verification_jobs')
      .insert({
        status: 'pending',
        total_emails: uniqueLeads.length,
        processed: 0,
        valid: 0,
        invalid: 0,
        risky: 0,
        unknown: 0,
        source_filename: filename,
        callback_url: callbackUrl,
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('Failed to create verification job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create verification job' },
        { status: 500 }
      );
    }

    // Insert placeholder results for each lead (with metadata)
    const resultRows = uniqueLeads.map((lead) => ({
      job_id: job.id,
      email: lead.email,
      first_name: lead.first_name || null,
      last_name: lead.last_name || null,
      company_name: lead.company_name || null,
      niche: lead.niche || null,
      verdict: 'unknown' as const,
      risk_level: 'medium' as const,
      score: 0,
    }));

    // Insert in batches of 500
    for (let i = 0; i < resultRows.length; i += 500) {
      const batch = resultRows.slice(i, i + 500);
      const { error: insertError } = await supabase
        .from('verification_results')
        .insert(batch);

      if (insertError) {
        console.error('Failed to insert verification results:', insertError);
        await supabase
          .from('verification_jobs')
          .update({ status: 'failed', error: insertError.message })
          .eq('id', job.id);
        return NextResponse.json(
          { error: 'Failed to queue emails for verification' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      job_id: job.id,
      status: 'pending',
      total_emails: uniqueLeads.length,
      deduplicated_from: leads.length,
    }, { status: 201 });
  } catch (err) {
    console.error('Bulk verification error:', err);
    return NextResponse.json(
      { error: 'Failed to process bulk verification request' },
      { status: 500 }
    );
  }
}
