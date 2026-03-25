// src/lib/pipeline/processor.ts
// ============================================
// Processes a single pending pipeline_lead through
// the full enrichment chain:
//   contact → email find → verify → research → push
// ============================================

import { supabase } from '@/lib/supabase/client';
import { findDecisionMaker } from '@/lib/enrichment/contact-finder';
import { findEmail } from '@/lib/finder';
import { researchLead } from '@/lib/enrichment/research-agent';
import { getCampaignId } from '@/lib/enrichment/campaign-mapper';
import { addLeadsToCampaign } from '@/lib/instantly';
import type { PipelineLead } from '@/lib/gtm/types';
import { addToWatchlist } from '@/lib/champions/watchlist';
import { syncLeadToCrm, logActivityToClose } from '@/lib/crm/close-sync';

async function updateLead(id: string, updates: Partial<PipelineLead>) {
  await supabase
    .from('pipeline_leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function processPipelineLead(lead: PipelineLead): Promise<void> {
  const { id, company_name, company_domain, signal_type, signal_summary, signal_date } = lead;

  try {
    // Step 1: Find decision maker
    await updateLead(id, { status: 'finding_contact' });
    const contact = await findDecisionMaker(company_name || '', company_domain);

    if (!contact) {
      await updateLead(id, { status: 'failed', failure_reason: 'no_contact_found' });
      return;
    }

    await updateLead(id, {
      first_name: contact.first_name,
      last_name: contact.last_name,
      title: contact.title,
      linkedin_url: contact.linkedin_url,
    });

    // Step 2: Find email
    await updateLead(id, { status: 'finding_email' });
    const emailResult = await findEmail(contact.first_name, contact.last_name, company_domain);

    if (!emailResult.found || !emailResult.email) {
      await updateLead(id, { status: 'failed', failure_reason: 'email_not_found' });
      return;
    }

    await updateLead(id, {
      email: emailResult.email,
      email_verified: emailResult.verdict === 'valid',
      email_verdict: emailResult.verdict,
      email_score: emailResult.score,
      email_found_via: emailResult.found_via,
      status: 'verifying',
    });

    // Only push verified emails
    if (emailResult.verdict !== 'valid') {
      await updateLead(id, { status: 'filtered', failure_reason: `email_verdict_${emailResult.verdict}` });
      return;
    }

    // signal_type is required for research and campaign routing
    if (!signal_type) {
      await updateLead(id, { status: 'failed', failure_reason: 'missing_signal_type' });
      return;
    }

    // Step 3: AI Research
    await updateLead(id, { status: 'researching' });
    const research = await researchLead({
      companyName: company_name || '',
      domain: company_domain,
      firstName: contact.first_name,
      lastName: contact.last_name,
      title: contact.title,
      signalType: signal_type,
      signalSummary: signal_summary || '',
    });

    await updateLead(id, {
      research_summary: research.research_summary,
      pain_points: research.pain_signals,
      opportunity_signals: research.opportunity_signals,
      personalized_opener: research.personalized_opener,
      research_data: research.raw_research,
    });

    // Step 4: Push to Instantly
    const campaignId = getCampaignId(signal_type);
    if (!campaignId) {
      await updateLead(id, { status: 'ready', failure_reason: 'no_campaign_configured' });
      return;
    }

    // A/B experiment routing — override campaign if active experiment exists
    let finalCampaignId = campaignId;
    try {
      const { data: activeExp } = await supabase
        .from('ab_experiments')
        .select('id, base_campaign_id, variant_campaign_ids, total_leads')
        .eq('signal_type', signal_type)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (activeExp) {
        const allCampaigns = [activeExp.base_campaign_id, ...(activeExp.variant_campaign_ids || [])];
        const variantIndex = (activeExp.total_leads || 0) % allCampaigns.length;
        finalCampaignId = allCampaigns[variantIndex];

        // Record assignment + increment counter (fire-and-forget)
        Promise.all([
          supabase.from('ab_experiment_leads').upsert({
            experiment_id: activeExp.id,
            lead_email: emailResult.email,
            variant_index: variantIndex,
            campaign_id: finalCampaignId,
          }, { onConflict: 'experiment_id,lead_email' }),
          supabase.from('ab_experiments')
            .update({ total_leads: (activeExp.total_leads || 0) + 1 })
            .eq('id', activeExp.id),
        ]).catch(console.error);
      }
    } catch {} // No active experiment — use default campaign

    const pushResult = await addLeadsToCampaign(finalCampaignId, [{
      email: emailResult.email,
      first_name: contact.first_name,
      last_name: contact.last_name,
      company_name: company_name || undefined,
      title: contact.title || undefined,
      personalized_opener: research.personalized_opener || undefined,
      signal_summary: signal_summary || undefined,
      research_summary: research.research_summary || undefined,
      signal_type: signal_type || undefined,
      signal_date: signal_date || undefined,
    }]);

    if (pushResult.error) {
      await updateLead(id, { status: 'failed', failure_reason: `instantly_error: ${pushResult.error}` });
      return;
    }

    await updateLead(id, {
      instantly_campaign_id: campaignId,
      status: 'pushed',
      pushed_at: new Date().toISOString(),
    });

    // Sync to Close CRM (fire-and-forget)
    syncLeadToCrm({
      email: emailResult.email,
      first_name: contact.first_name,
      last_name: contact.last_name,
      title: contact.title,
      company_name: company_name,
      company_domain,
      signal_type,
      signal_summary,
      campaign_id: campaignId,
      email_found_via: emailResult.found_via,
    }).catch(console.error);

    // Log email sent to Close activity timeline
    logActivityToClose({
      type: 'email_sent',
      leadEmail: lead.email || '',
      subject: `ColdCraft Outbound — ${lead.signal_type}`,
      body: `Personalized opener: ${lead.personalized_opener || 'N/A'}`,
    }).catch(() => {}); // fire-and-forget

    // Add to champion watchlist for job-change monitoring
    await addToWatchlist({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: emailResult.email,
      linkedin_url: contact.linkedin_url,
      title: contact.title,
      company_name: company_name || null,
      company_domain,
    }).catch(console.error);

  } catch (err) {
    console.error(`Pipeline processor error for lead ${id}:`, err);
    await updateLead(id, {
      status: 'failed',
      failure_reason: err instanceof Error ? err.message : 'unknown_error',
    });
  }
}
