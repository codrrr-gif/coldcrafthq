// src/app/api/linkedin/monitor/route.ts
// Accepts a list of LinkedIn profile URLs and returns posts + draft comments.
// Used by the dashboard to review engagement opportunities before sending.

import { NextRequest, NextResponse } from 'next/server';
import { monitorProspectPosts } from '@/lib/linkedin/social-monitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { linkedin_urls } = await req.json() as { linkedin_urls: string[] };

  if (!Array.isArray(linkedin_urls) || !linkedin_urls.length) {
    return NextResponse.json({ error: 'linkedin_urls array required' }, { status: 400 });
  }

  const posts = await monitorProspectPosts(linkedin_urls.slice(0, 20));
  return NextResponse.json({ posts, count: posts.length });
}
