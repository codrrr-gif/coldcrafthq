// src/app/api/finder/find/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { findEmail } from '@/lib/finder';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { first_name, last_name, domain } = await req.json();

    if (!first_name || !last_name || !domain) {
      return NextResponse.json(
        { error: 'first_name, last_name, and domain are required' },
        { status: 400 }
      );
    }

    const result = await findEmail(first_name, last_name, domain);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Finder error:', err);
    return NextResponse.json({ error: 'Find failed' }, { status: 500 });
  }
}
