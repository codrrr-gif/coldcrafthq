import { NextRequest, NextResponse } from 'next/server';
import { checkAccountHealth } from '@/lib/instantly-health';
import { notifyCronFailure } from '@/lib/slack';
import { requireSecret } from '@/lib/auth/api-auth';

export async function GET(request: NextRequest) {
  // Auth is mandatory — reject if secret not configured
  const authErr = requireSecret(request);
  if (authErr) return authErr;

  try {
    const result = await checkAccountHealth();
    console.log(`[account-health] ${result.accounts} accounts, ${result.flagged} flagged`);
    return NextResponse.json({ accounts: result.accounts, flagged: result.flagged });
  } catch (error) {
    console.error('[account-health] Failed:', error);
    await notifyCronFailure('account-health', error).catch(() => {});
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
