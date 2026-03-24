// src/lib/champions/job-change-detector.ts
// Uses Apify LinkedIn Profile Scraper to detect job changes.
// When a champion moves companies → create a new pipeline_lead.

import { runActor, getRunStatus, getDatasetItems } from '@/lib/apify';
import { supabase } from '@/lib/supabase/client';
import { getStaleWatchlistEntries } from './watchlist';

export async function detectJobChanges(): Promise<number> {
  const entries = await getStaleWatchlistEntries(30);
  if (!entries.length) return 0;

  const linkedinUrls = entries
    .map((e) => e.linkedin_url)
    .filter(Boolean) as string[];

  try {
    const { runId, datasetId } = await runActor('apify/linkedin-profile-scraper', {
      profileUrls: linkedinUrls,
    });

    for (let i = 0; i < 36; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const status = await getRunStatus(runId);
      if (status.status === 'SUCCEEDED') {
        const profiles = await getDatasetItems(datasetId, linkedinUrls.length);
        let changesDetected = 0;

        for (const profile of profiles) {
          const linkedinUrl = String(profile.url || profile.linkedInUrl || '');
          const currentCompany = String(
            profile.currentCompany ||
            (profile.headline ? String(profile.headline).split(' at ').pop() : '') ||
            ''
          );
          const currentTitle = String(profile.title || profile.currentPosition || '');

          const watchlistEntry = entries.find((e) => e.linkedin_url === linkedinUrl);
          if (!watchlistEntry) continue;

          // Always update last_checked_at
          await supabase.from('champion_watchlist')
            .update({ last_checked_at: new Date().toISOString() })
            .eq('id', watchlistEntry.id);

          // Detect company change
          const companyChanged =
            currentCompany &&
            currentCompany.toLowerCase() !== (watchlistEntry.last_known_company || '').toLowerCase();

          if (companyChanged) {
            const liCompanyUrl = String(profile.companyUrl || '');
            const slug = liCompanyUrl.replace(/.*linkedin\.com\/company\//, '').replace(/\/$/, '');
            const newDomain = slug ? `${slug}.com` : `${currentCompany.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

            await supabase.from('champion_watchlist').update({
              new_company_detected: currentCompany,
              new_company_domain: newDomain,
              new_title: currentTitle,
              change_detected_at: new Date().toISOString(),
            }).eq('id', watchlistEntry.id);

            // Create new pipeline_lead for warm re-engagement
            await supabase.from('pipeline_leads').insert({
              company_name: currentCompany,
              company_domain: newDomain,
              first_name: watchlistEntry.contact_first_name,
              last_name: watchlistEntry.contact_last_name,
              title: currentTitle,
              linkedin_url: linkedinUrl,
              email: watchlistEntry.contact_email,
              signal_type: 'job_change',
              signal_summary: `${watchlistEntry.contact_first_name} ${watchlistEntry.contact_last_name} moved from ${watchlistEntry.last_known_company} to ${currentCompany}`,
              signal_date: new Date().toISOString().split('T')[0],
              signal_score: 75,
              status: 'pending',
            });

            changesDetected++;
          }
        }
        return changesDetected;
      }
      if (['FAILED', 'TIMED-OUT', 'ABORTED'].includes(status.status)) break;
    }
  } catch (err) {
    console.error('[job-change-detector] Detection failed:', err);
  }
  return 0;
}
