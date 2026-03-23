// src/app/api/finder/bulk/route.ts
// Accepts CSV with columns: first_name, last_name, domain (or company_domain)
// Returns CSV with added email + email_found + email_verdict columns

import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { findEmail } from '@/lib/finder';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const text = await file.text();
    const { data: rows, errors } = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length && !rows.length) {
      return NextResponse.json({ error: 'Failed to parse CSV' }, { status: 400 });
    }

    const results: Record<string, string>[] = [];

    for (let i = 0; i < Math.min(rows.length, 100); i++) {
      const row = rows[i];
      const firstName = row.first_name || row.firstName || row['First Name'] || '';
      const lastName  = row.last_name  || row.lastName  || row['Last Name']  || '';
      const domain    = row.domain || row.company_domain || row['Company Domain'] || '';

      if (!firstName || !lastName || !domain) {
        results.push({
          ...row,
          email: '',
          email_found: 'false',
          email_verdict: 'missing_fields',
          email_score: '',
          email_found_via: '',
        });
        continue;
      }

      const found = await findEmail(firstName, lastName, domain);
      results.push({
        ...row,
        email: found.email || '',
        email_found: String(found.found),
        email_verdict: found.verdict || '',
        email_score: String(found.score ?? ''),
        email_found_via: found.found_via || '',
      });
    }

    const csv = Papa.unparse(results);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="enriched-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    console.error('Bulk finder error:', err);
    return NextResponse.json({ error: 'Bulk find failed' }, { status: 500 });
  }
}
