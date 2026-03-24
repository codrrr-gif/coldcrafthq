// ============================================
// Regenerate Reply — Get a fresh AI draft
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { draftReply } from '@/lib/ai/draft-reply';
import type { SubCategory } from '@/lib/ai/playbooks';
import type { ThreadMessage } from '@/lib/types';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const { data: reply, error } = await supabase
    .from('replies')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !reply) {
    return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
  }

  const subCategory = (reply.sub_category || 'custom.other') as SubCategory;

  const result = await draftReply(
    subCategory,
    reply.original_message,
    (reply.thread_history || []) as ThreadMessage[],
    reply.lead_email,
    reply.lead_name,
    reply.lead_company
  );

  // Update with new draft
  await supabase
    .from('replies')
    .update({
      ai_reply: result.reply,
      alternative_reply: result.alternative_reply,
      confidence: result.confidence,
      framework_used: result.framework_used,
      ai_reasoning: result.reasoning,
      knowledge_used: result.knowledge_used.join(', '),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  return NextResponse.json({
    success: true,
    reply: result.reply,
    alternative_reply: result.alternative_reply,
    confidence: result.confidence,
    framework: result.framework_used,
    reasoning: result.reasoning,
  });
}
