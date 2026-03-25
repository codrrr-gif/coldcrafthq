import { NextResponse } from 'next/server';
import { checkRevenueOutcomes } from '@/lib/crm/revenue-attribution';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkRevenueOutcomes();
    console.log('[revenue-check]', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[revenue-check] Failed:', error);
    return NextResponse.json({ error: 'Revenue check failed' }, { status: 500 });
  }
}
