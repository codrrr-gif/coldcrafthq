import { NextRequest, NextResponse } from 'next/server';
import { requirePortalSession, hasRole } from '@/lib/portal/auth';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  const { session, error } = await requirePortalSession();
  if (error) return error;

  const { data } = await supabase
    .from('knowledge_base')
    .select('id, title, content, category, created_at, updated_at')
    .eq('client_id', session.clientId)
    .order('category')
    .limit(500);

  return NextResponse.json({ entries: data || [] });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requirePortalSession();
  if (error) return error;
  if (!hasRole(session, 'owner')) {
    return NextResponse.json({ error: 'Owner role required' }, { status: 403 });
  }

  const { title, content, category } = await req.json();

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from('knowledge_base')
    .insert({
      client_id: session.clientId,
      title: title.trim(),
      content: content.trim(),
      category: category || 'general',
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ entry: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requirePortalSession();
  if (error) return error;
  if (!hasRole(session, 'owner')) {
    return NextResponse.json({ error: 'Owner role required' }, { status: 403 });
  }

  const { id, title, content, category } = await req.json();

  if (!id || !title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'id, title, and content are required' }, { status: 400 });
  }

  const { error: dbError } = await supabase
    .from('knowledge_base')
    .update({ title: title.trim(), content: content.trim(), category: category || 'general', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('client_id', session.clientId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requirePortalSession();
  if (error) return error;
  if (!hasRole(session, 'owner')) {
    return NextResponse.json({ error: 'Owner role required' }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error: dbError } = await supabase.from('knowledge_base').delete().eq('id', id).eq('client_id', session.clientId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
