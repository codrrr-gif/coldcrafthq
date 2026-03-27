import { NextRequest, NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal/auth';
import { supabase } from '@/lib/supabase/client';
import { insertActivity } from '@/lib/portal/activity';
import { notifySlack } from '@/lib/slack';

// GET: List requests for this client
export async function GET() {
  const { session, error } = await requirePortalSession();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from('client_requests')
    .select('*')
    .eq('client_id', session.clientId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ requests: data || [] });
}

// POST: Submit a new request
export async function POST(req: NextRequest) {
  const { session, error } = await requirePortalSession();
  if (error) return error;

  const { type, subject, description } = await req.json();

  if (!type || !subject?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'type, subject, and description are required' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from('client_requests')
    .insert({
      client_id: session.clientId,
      submitted_by: session.userId,
      type,
      subject: subject.trim(),
      description: description.trim(),
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Activity + Slack (fire-and-forget)
  insertActivity(session.clientId, 'request_update', `New request: ${subject}`).catch(() => {});
  notifySlack(`New request from ${session.clientName}: "${subject}" (${type})`, 'info').catch(() => {});

  return NextResponse.json({ request: data }, { status: 201 });
}
