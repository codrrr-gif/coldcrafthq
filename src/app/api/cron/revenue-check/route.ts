import { NextRequest, NextResponse } from 'next/server';
import { checkRevenueOutcomes } from '@/lib/crm/revenue-attribution';
import { notifyCronFailure } from '@/lib/slack';
import { requireSecret } from '@/lib/auth/api-auth';

export async function GET(request: NextRequest) {
  // Auth is mandatory — reject if secret not configured
  const authErr = requireSecret(request);
  if (authErr) return authErr;

  try {
    const result = await checkRevenueOutcomes();
    console.log('[revenue-check]', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[revenue-check] Failed:', error);
    await notifyCronFailure('revenue-check', error).catch(() => {});
    return NextResponse.json({ error: 'Revenue check failed' }, { status: 500 });
  }
}
