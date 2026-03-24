// ============================================
// Revise, Train & Send Reply
// ============================================
// When human edits the AI draft, we:
// 1. Store the revision as a training example
// 2. Send the revised version
// 3. The system learns for next time

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { sendReply } from '@/lib/instantly';
import { storeTrainingExample } from '@/lib/ai/train';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { revised_reply } = await req.json();

  if (!revised_reply?.trim()) {
    return NextResponse.json(
      { error: 'revised_reply is required' },
      { status: 400 }
    );
  }

  // Get the original reply
  const { data: reply, error: fetchError } = await supabase
    .from('replies')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !reply) {
    return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
  }

  // Train: store the revision so AI learns
  if (reply.ai_reply && reply.ai_reply !== revised_reply) {
    try {
      await storeTrainingExample(id, reply.ai_reply, revised_reply);
    } catch (err) {
      console.error('Failed to store training example:', err);
      // Non-blocking — still send the reply
    }
  }

  // Update the reply with revision
  await supabase
    .from('replies')
    .update({
      revised_reply,
      final_reply: revised_reply,
      status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  // Send via Instantly
  if (reply.instantly_campaign_id) {
    const result = await sendReply(
      reply.instantly_campaign_id,
      reply.lead_email,
      revised_reply
    );

    const newStatus = result.success ? 'sent' : 'failed';
    await supabase
      .from('replies')
      .update({
        status: newStatus,
        send_result: result,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({
      success: result.success,
      status: newStatus,
      trained: true,
      ...(result.error && { error: result.error }),
    });
  }

  return NextResponse.json({ success: true, status: 'approved', trained: true });
}
