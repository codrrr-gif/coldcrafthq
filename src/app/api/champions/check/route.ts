// src/app/api/champions/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { detectJobChanges } from '@/lib/champions/job-change-detector';
import { requireSecret } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  // Auth is mandatory — reject if secret not configured
  const authErr = requireSecret(req);
  if (authErr) return authErr;
  const changes = await detectJobChanges();
  return NextResponse.json({ changes_detected: changes });
}
