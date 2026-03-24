// ============================================
// Approve & Send Reply
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { sendReply } from '@/lib/instantly';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Get the reply
  const { data: reply, error: fetchError } = await supabase
    .from('replies')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !reply) {
    return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
  }

  if (reply.status === 'sent') {
    return NextResponse.json({ error: 'Already sent' }, { status: 400 });
  }

  const replyText = reply.ai_reply;
  if (!replyText) {
    return NextResponse.json({ error: 'No AI reply to send' }, { status: 400 });
  }

  // Update status to approved
  await supabase
    .from('replies')
    .update({
      status: 'approved',
      final_reply: replyText,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  // Send via Instantly
  if (reply.instantly_campaign_id) {
    const result = await sendReply(
      reply.instantly_campaign_id,
      reply.lead_email,
      replyText
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
      ...(result.error && { error: result.error }),
    });
  }

  return NextResponse.json({ success: true, status: 'approved' });
}
