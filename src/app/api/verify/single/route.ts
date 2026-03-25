// ============================================
// Single Email Verification API
// ============================================
// POST /api/verify/single
// Body: { email: string, skip_smtp?: boolean }

import { NextRequest, NextResponse } from 'next/server';
import { verifyEmail } from '@/lib/verify/pipeline';
import { requireSecret } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authErr = requireSecret(req);
  if (authErr) return authErr;

  try {
    const { email, skip_smtp } = await req.json();

    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      );
    }

    const result = await verifyEmail(email.trim(), {
      skip_smtp: skip_smtp || false,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Single verification error:', err);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
