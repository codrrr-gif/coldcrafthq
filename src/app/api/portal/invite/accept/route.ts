import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { hash } from 'bcryptjs';
import { supabase } from '@/lib/supabase/client';
import { insertActivity } from '@/lib/portal/activity';
import { notifySlack } from '@/lib/slack';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: 'token and password are required' }, { status: 400 });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const secret = process.env.INVITE_JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });

  let payload: { userId: string; clientId: string };
  try {
    payload = verify(token, secret) as { userId: string; clientId: string };
  } catch {
    return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 });
  }

  const passwordHash = await hash(password, 12);

  const { data: updated, error: dbError } = await supabase
    .from('client_users')
    .update({
      password_hash: passwordHash,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', payload.userId)
    .eq('client_id', payload.clientId)
    .is('accepted_at', null)
    .select('id')
    .single();

  if (dbError || !updated) {
    return NextResponse.json({ error: 'Invitation already accepted or invalid' }, { status: 400 });
  }

  const { data: client } = await supabase.from('clients').select('name').eq('id', payload.clientId).single();

  insertActivity(payload.clientId, 'system', 'Client accepted invitation and set up their account').catch(() => {});
  notifySlack(`${client?.name || 'Client'} accepted their portal invitation`, 'info').catch(() => {});

  return NextResponse.json({ success: true });
}
