// src/lib/pipeline/signal-scoring-feedback.ts
// Feedback loop: when a lead replies, record which signal type + source produced it.
// This data feeds back into signal scoring to weight better-performing sources.

import { supabase } from '@/lib/supabase/client';

// Record that a reply came from a specific signal type and email finding method
export async function recordReplyFeedback(leadEmail: string, category: string): Promise<void> {
  try {
    // Look up the pipeline lead to get signal metadata
    const { data: lead } = await supabase
      .from('pipeline_leads')
      .select('signal_type, email_found_via, composite_score, company_domain')
      .eq('email', leadEmail)
      .limit(1)
      .maybeSingle();

    if (!lead?.signal_type) return;

    const isPositive = category === 'interested';

    // Upsert into signal_performance table
    await supabase.rpc('increment_signal_performance', {
      p_signal_type: lead.signal_type,
      p_email_found_via: lead.email_found_via || 'unknown',
      p_is_positive: isPositive,
    }).then(null, async () => {
      // If RPC doesn't exist yet, fall back to direct insert
      await supabase.from('signal_performance').upsert({
        signal_type: lead.signal_type,
        email_found_via: lead.email_found_via || 'unknown',
        total_replies: 1,
        positive_replies: isPositive ? 1 : 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'signal_type,email_found_via',
      });
    });
  } catch (err) {
    console.error('[signal-feedback] Failed to record reply feedback:', err);
  }
}

// Get performance data for dashboard display
export async function getSignalPerformance(): Promise<Array<{
  signal_type: string;
  email_found_via: string;
  total_replies: number;
  positive_replies: number;
  positive_rate: number;
}>> {
  const { data } = await supabase
    .from('signal_performance')
    .select('*')
    .order('positive_replies', { ascending: false });

  return (data || []).map((row) => ({
    ...row,
    positive_rate: row.total_replies > 0 ? row.positive_replies / row.total_replies : 0,
  }));
}
