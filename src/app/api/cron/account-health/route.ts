import { NextResponse } from 'next/server';
import { checkAccountHealth } from '@/lib/instantly-health';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkAccountHealth();
    console.log(`[account-health] ${result.accounts} accounts, ${result.flagged} flagged`);
    return NextResponse.json({ accounts: result.accounts, flagged: result.flagged });
  } catch (error) {
    console.error('[account-health] Failed:', error);
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
