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
import { parseCsvEmails } from '@/lib/verify/csv-parser';

export const dynamic = 'force-dynamic';

const MAX_EMAILS_PER_JOB = 50000;

export async function POST(req: NextRequest) {
  try {
    let emails: string[] = [];
    let filename: string | null = null;
    let callbackUrl: string | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // CSV file upload
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const emailColumn = (formData.get('email_column') as string) || 'email';
      callbackUrl = (formData.get('callback_url') as string) || null;

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      filename = file.name;
      const text = await file.text();
      emails = parseCsvEmails(text, emailColumn);
    } else {
      // JSON body
      const body = await req.json();
      emails = body.emails || [];
      callbackUrl = body.callback_url || null;
    }

    if (!emails.length) {
      return NextResponse.json(
        { error: 'No emails provided' },
        { status: 400 }
      );
    }

    // Deduplicate and normalize
    const normalized = emails
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.length > 0 && e.includes('@'));
    const uniqueEmails = Array.from(new Set(normalized));

    if (uniqueEmails.length > MAX_EMAILS_PER_JOB) {
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
        total_emails: uniqueEmails.length,
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

    // Insert placeholder results for each email
    const resultRows = uniqueEmails.map((email: string) => ({
      job_id: job.id,
      email,
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
      total_emails: uniqueEmails.length,
      deduplicated_from: emails.length,
    }, { status: 201 });
  } catch (err) {
    console.error('Bulk verification error:', err);
    return NextResponse.json(
      { error: 'Failed to process bulk verification request' },
      { status: 500 }
    );
  }
}
