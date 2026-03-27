import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { insertActivity } from '@/lib/portal/activity';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { status, admin_response } = await req.json();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (admin_response) updates.admin_response = admin_response;
  if (status === 'resolved') updates.resolved_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('client_requests')
    .update(updates)
    .eq('id', params.id)
    .select('*, clients(name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data) {
    insertActivity(
      data.client_id,
      'request_update',
      `Request "${data.subject}" updated to ${status}`,
      admin_response || undefined
    ).catch(() => {});
  }

  return NextResponse.json({ request: data });
}
