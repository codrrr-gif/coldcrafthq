// ============================================
// Knowledge Base API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import {
  addKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
} from '@/lib/ai/train';

// GET /api/knowledge — List all knowledge entries
export async function GET() {
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('id, title, content, category, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data || [] });
}

// POST /api/knowledge — Add new knowledge entry
export async function POST(req: NextRequest) {
  const { title, content, category } = await req.json();

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json(
      { error: 'title and content are required' },
      { status: 400 }
    );
  }

  const result = await addKnowledgeEntry(
    title.trim(),
    content.trim(),
    category || 'company_info'
  );

  if (!result) {
    return NextResponse.json(
      { error: 'Failed to add knowledge entry' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, id: result.id }, { status: 201 });
}

// PUT /api/knowledge — Update knowledge entry
export async function PUT(req: NextRequest) {
  const { id, title, content, category } = await req.json();

  if (!id || !title?.trim() || !content?.trim()) {
    return NextResponse.json(
      { error: 'id, title, and content are required' },
      { status: 400 }
    );
  }

  const success = await updateKnowledgeEntry(id, title.trim(), content.trim(), category || 'general');

  if (!success) {
    return NextResponse.json(
      { error: 'Failed to update knowledge entry' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/knowledge — Delete knowledge entry
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const success = await deleteKnowledgeEntry(id);

  if (!success) {
    return NextResponse.json(
      { error: 'Failed to delete knowledge entry' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
