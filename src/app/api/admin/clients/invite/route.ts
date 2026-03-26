import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { sign } from 'jsonwebtoken';
import { notifySlack } from '@/lib/slack';

export async function POST(req: NextRequest) {
  const { client_id } = await req.json();

  if (!client_id) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
  }

  const { data: client } = await supabase.from('clients').select('name, billing_email').eq('id', client_id).single();
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const { data: user } = await supabase
    .from('client_users')
    .select('id, email')
    .eq('client_id', client_id)
    .eq('role', 'owner')
    .single();

  if (!user) return NextResponse.json({ error: 'No owner user found' }, { status: 404 });

  const secret = process.env.INVITE_JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) return NextResponse.json({ error: 'INVITE_JWT_SECRET not configured' }, { status: 503 });

  const token = sign({ userId: user.id, clientId: client_id }, secret, { expiresIn: '7d' });
  const portalUrl = process.env.PORTAL_URL || 'https://www.coldcrafthq.com/portal';
  const inviteUrl = `${portalUrl}/invite?token=${token}`;

  // TODO: Send invite email via Resend when configured
  // For now, return the URL so the admin can send it manually
  console.log(`[invite] Invite URL for ${client.name}: ${inviteUrl}`);

  notifySlack(`Invitation generated for ${client.name} (${user.email})`, 'info').catch(() => {});

  return NextResponse.json({ invite_url: inviteUrl, email: user.email });
}
