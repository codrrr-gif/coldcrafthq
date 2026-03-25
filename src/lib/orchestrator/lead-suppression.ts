import { supabase } from '@/lib/supabase/client';

/**
 * Check if a lead should be suppressed from further outreach.
 * Returns true if the lead has replied, booked a meeting, opted out, or been marked not interested.
 */
export async function isLeadSuppressed(leadId: string): Promise<boolean> {
  // Check conversations for terminal states
  const { count: terminalConversations } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .in('classification', ['interested', 'meeting_booked', 'not_interested']);

  if ((terminalConversations || 0) > 0) return true;

  // Check voice calls for opt-out
  const { count: voiceOptOuts } = await supabase
    .from('voice_calls')
    .select('*', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .in('outcome', ['not_interested', 'do_not_call']);

  if ((voiceOptOuts || 0) > 0) return true;

  // Check replies table for any response (lead already engaged)
  const { count: replies } = await supabase
    .from('replies')
    .select('*', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .in('category', ['interested', 'not_interested', 'meeting']);

  return (replies || 0) > 0;
}
