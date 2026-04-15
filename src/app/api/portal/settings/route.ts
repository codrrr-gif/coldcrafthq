import { NextRequest, NextResponse } from 'next/server';
import { requirePortalSession, hasRole } from '@/lib/portal/auth';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  const { session, error } = await requirePortalSession();
  if (error) return error;

  const { data: client } = await supabase
    .from('clients')
    .select('name, slug, logo_url, primary_color, portal_name, favicon_url')
    .eq('id', session.clientId)
    .single();

  const { data: team } = await supabase
    .from('client_users')
    .select('id, email, name, role, last_login_at, accepted_at')
    .eq('client_id', session.clientId)
    .order('created_at');

  return NextResponse.json({ client: client || {}, team: team || [] });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requirePortalSession();
  if (error) return error;

  if (!hasRole(session, 'owner')) {
    return NextResponse.json({ error: 'Owner role required' }, { status: 403 });
  }

  const { portal_name, primary_color, logo_url } = await req.json();

  if (primary_color && !/^#[0-9a-fA-F]{6}$/.test(primary_color)) {
    return NextResponse.json({ error: 'primary_color must be a valid hex color (e.g. #1a2b3c)' }, { status: 400 });
  }

  if (logo_url && !/^https:\/\/.+/.test(logo_url)) {
    return NextResponse.json({ error: 'logo_url must be an https:// URL' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (portal_name !== undefined) updates.portal_name = portal_name || null;
  if (primary_color !== undefined) updates.primary_color = primary_color || null;
  if (logo_url !== undefined) updates.logo_url = logo_url || null;

  await supabase.from('clients').update(updates).eq('id', session.clientId);

  return NextResponse.json({ success: true });
}
