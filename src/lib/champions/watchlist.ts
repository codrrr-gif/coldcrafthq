// src/lib/champions/watchlist.ts
// Manages the champion watchlist — contacts we monitor for job changes.

import { supabase } from '@/lib/supabase/client';

export async function addToWatchlist(lead: {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  linkedin_url: string | null;
  title: string | null;
  company_name: string | null;
  company_domain: string;
}): Promise<void> {
  if (!lead.first_name || !lead.last_name) return;
  if (!lead.linkedin_url && !lead.email) return;

  await supabase.from('champion_watchlist').upsert({
    contact_first_name: lead.first_name,
    contact_last_name: lead.last_name,
    contact_email: lead.email,
    linkedin_url: lead.linkedin_url,
    last_known_company: lead.company_name,
    last_known_domain: lead.company_domain,
    last_known_title: lead.title,
    source: 'pipeline_outcome',
  }, { onConflict: 'linkedin_url', ignoreDuplicates: true });
}

export async function getStaleWatchlistEntries(limit = 50) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('champion_watchlist')
    .select('*')
    .or(`last_checked_at.is.null,last_checked_at.lt.${sevenDaysAgo}`)
    .eq('sequence_triggered', false)
    .not('linkedin_url', 'is', null)
    .limit(limit);
  return data || [];
}
