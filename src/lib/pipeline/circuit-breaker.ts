import { supabase } from '@/lib/supabase/client';

const MAX_DAILY_LEADS_PROCESSED = 100;  // Safety cap
const MAX_DAILY_LEADS_PUSHED = 50;       // Even stricter for outgoing

/**
 * Check if we've exceeded daily processing limits.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export async function checkDailyLimits(): Promise<{ allowed: boolean; reason?: string }> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: processedToday } = await supabase
    .from('pipeline_leads')
    .select('*', { count: 'exact', head: true })
    .gte('updated_at', todayStart.toISOString())
    .in('status', ['pushed', 'finding_contact', 'finding_email', 'verifying', 'researching', 'failed']);

  if ((processedToday || 0) >= MAX_DAILY_LEADS_PROCESSED) {
    return { allowed: false, reason: `Daily processing cap reached (${processedToday}/${MAX_DAILY_LEADS_PROCESSED})` };
  }

  const { count: pushedToday } = await supabase
    .from('pipeline_leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pushed')
    .gte('pushed_at', todayStart.toISOString());

  if ((pushedToday || 0) >= MAX_DAILY_LEADS_PUSHED) {
    return { allowed: false, reason: `Daily push cap reached (${pushedToday}/${MAX_DAILY_LEADS_PUSHED})` };
  }

  return { allowed: true };
}
