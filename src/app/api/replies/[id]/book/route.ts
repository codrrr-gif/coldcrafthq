// ============================================
// Mark Reply as Meeting Booked
// ============================================
// Strongest positive signal. The reply WORKED.

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { scoreReplyOutcome } from '@/lib/ai/outcomes';
import { createOpportunityInCrm } from '@/lib/crm/close-sync';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: reply, error } = await supabase
    .from('replies')
    .select('id, status, lead_email, lead_name, lead_company')
    .eq('id', id)
    .single();

  if (error || !reply) {
    return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
  }

  if (reply.status !== 'sent') {
    return NextResponse.json({ error: 'Can only mark sent replies as booked' }, { status: 400 });
  }

  await scoreReplyOutcome(id, '', 'meeting_booked', 'Manually marked as meeting booked');

  // Create opportunity in Close CRM (fire-and-forget)
  createOpportunityInCrm({
    email: reply.lead_email,
    company: reply.lead_company,
    lead_name: reply.lead_name,
  }).catch(console.error);

  // Log meeting_booked activity to Close
  const { logActivityToClose } = await import('@/lib/crm/close-sync');
  logActivityToClose({
    type: 'meeting_booked',
    leadEmail: reply.lead_email,
    note: `Manual booking via dashboard — reply #${reply.id}`,
  }).catch(() => {});

  return NextResponse.json({ success: true, outcome: 'meeting_booked' });
}
