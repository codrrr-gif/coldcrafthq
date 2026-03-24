// ============================================
// Mark Reply as Meeting Booked
// ============================================
// Strongest positive signal. The reply WORKED.

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { scoreReplyOutcome } from '@/lib/ai/outcomes';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const { data: reply, error } = await supabase
    .from('replies')
    .select('id, status, lead_email, lead_name')
    .eq('id', id)
    .single();

  if (error || !reply) {
    return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
  }

  if (reply.status !== 'sent') {
    return NextResponse.json({ error: 'Can only mark sent replies as booked' }, { status: 400 });
  }

  await scoreReplyOutcome(id, '', 'meeting_booked', 'Manually marked as meeting booked');

  return NextResponse.json({ success: true, outcome: 'meeting_booked' });
}
