// src/app/api/voice/trigger/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { scheduleFollowUpCalls } from '@/lib/voice/call-scheduler';
import { requireSecret } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Auth is mandatory — reject if secret not configured
  const authErr = requireSecret(req);
  if (authErr) return authErr;
  const called = await scheduleFollowUpCalls();
  return NextResponse.json({ calls_initiated: called });
}
