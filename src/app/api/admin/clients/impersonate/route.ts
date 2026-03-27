import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { sign } from 'jsonwebtoken';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { client_id } = await req.json();
  if (!client_id) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 });
  }

  const { data: client, error } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', client_id)
    .single();

  if (error || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const impersonationToken = sign(
    {
      clientId: client.id,
      clientName: client.name,
      role: 'owner',
      impersonator: token.email,
      purpose: 'portal-impersonate',
    },
    secret,
    { expiresIn: '5m' }
  );

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3099';
  const url = `${baseUrl}/portal/impersonate?token=${impersonationToken}`;

  return NextResponse.json({ url });
}
