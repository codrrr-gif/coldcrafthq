// src/lib/pipeline/processor.ts
// ============================================
// Processes a single pending pipeline_lead through
// the full enrichment chain:
//   contact → email find → verify → research → push
// ============================================

import { supabase } from '@/lib/supabase/client';
import { findDecisionMaker, type Contact } from '@/lib/enrichment/contact-finder';
import { findEmail } from '@/lib/finder';
import { researchLead } from '@/lib/enrichment/research-agents';
import { getCampaignId } from '@/lib/enrichment/campaign-mapper';
import { addLeadsToCampaign } from '@/lib/instantly';
import type { PipelineLead } from '@/lib/gtm/types';
import { addToWatchlist } from '@/lib/champions/watchlist';
import { syncLeadToCrm, logActivityToClose } from '@/lib/crm/close-sync';
import { calculateCompositeScore } from '@/lib/pipeline/composite-scorer';

// Quick company pre-enrichment via Perplexity — gets industry/size to filter non-ICP
// before burning credits on contact finding and email lookup
async function preEnrichCompany(
  companyName: string,
  companyDomain: string,
): Promise<{ industry: string | null; size: string | null; location: string | null; skip: boolean; reason?: string }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return { industry: null, size: null, location: null, skip: false };

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{
          role: 'user',
          content: `What does ${companyName} (${companyDomain}) do? Return ONLY JSON:
{"industry": "...", "employee_range": "1-10|11-50|51-200|201-500|500+|unknown", "country": "US|UK|CA|AU|DE|...|unknown", "is_b2b": true/false}
If unsure, use "unknown". Do NOT make up data.`,
        }],
        max_tokens: 100,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { industry: null, size: null, location: null, skip: false };

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) return { industry: null, size: null, location: null, skip: false };

    const parsed = JSON.parse(match[0]);

    // Filter non-B2B companies
    if (parsed.is_b2b === false) {
      return { industry: parsed.industry, size: parsed.employee_range, location: parsed.country, skip: true, reason: 'non_b2b' };
    }

    // Filter non-target geographies
    const targetGeos = ['US', 'USA', 'UK', 'GB', 'CA', 'AU', 'US/UK', 'US/CA'];
    if (parsed.country && parsed.country !== 'unknown' && !targetGeos.some(g => parsed.country?.toUpperCase().includes(g))) {
      return { industry: parsed.industry, size: parsed.employee_range, location: parsed.country, skip: true, reason: 'non_target_geo' };
    }

    return { industry: parsed.industry || null, size: parsed.employee_range || null, location: parsed.country || null, skip: false };
  } catch {
    return { industry: null, size: null, location: null, skip: false };
  }
}

// Fallback contact finder for job posting signals.
// If standard contact finder fails, use the job posting headline to ask
// Perplexity for the hiring manager or their boss.
async function findContactFromJobSignal(
  companyName: string,
  companyDomain: string,
  signalSummary: string,
): Promise<Contact | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [{
          role: 'user',
          content: `${companyName} (${companyDomain}) posted this job: "${signalSummary}".
Who is most likely the hiring manager for this role? If you can't find the hiring manager, who is the CEO or founder?
Return ONLY JSON: {"first_name": "...", "last_name": "...", "title": "..."}
If you cannot find anyone real, return {"first_name": null}`,
        }],
        max_tokens: 150,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!parsed.first_name || !parsed.last_name) return null;

    return {
      first_name: parsed.first_name.trim(),
      last_name: parsed.last_name.trim(),
      title: String(parsed.title || '').trim(),
      linkedin_url: null,
      source: 'job_posting_fallback',
    };
  } catch {
    return null;
  }
}

async function updateLead(id: string, updates: Partial<PipelineLead>) {
  await supabase
    .from('pipeline_leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function processPipelineLead(lead: PipelineLead): Promise<void> {
  const { id, company_name, company_domain, signal_type, signal_summary, signal_date } = lead;

  try {
    // Step 0: Company pre-enrichment — filter non-ICP before expensive enrichment
    if (!lead.company_industry) {
      const enrichment = await preEnrichCompany(company_name || '', company_domain);
      if (enrichment.skip) {
        await updateLead(id, { status: 'filtered', failure_reason: enrichment.reason || 'non_icp' });
        return;
      }
      // Store enrichment data for composite scoring
      if (enrichment.industry || enrichment.size || enrichment.location) {
        await updateLead(id, {
          company_industry: enrichment.industry,
          company_size: enrichment.size,
          company_location: enrichment.location,
        } as Partial<PipelineLead>);
      }
    }

    // Step 1: Find decision maker (skip if already found on a previous run)
    let contact: { first_name: string; last_name: string; title: string; linkedin_url: string | null };
    if (lead.first_name && lead.last_name) {
      contact = { first_name: lead.first_name, last_name: lead.last_name, title: lead.title || '', linkedin_url: lead.linkedin_url || null };
    } else {
      await updateLead(id, { status: 'finding_contact' });
      let found = await findDecisionMaker(company_name || '', company_domain);

      if (!found) {
        // Fallback: for job postings, try Perplexity with the specific role from the signal
        if (signal_type === 'job_posting' && signal_summary) {
          found = await findContactFromJobSignal(company_name || '', company_domain, signal_summary);
        }
        if (!found) {
          await updateLead(id, { status: 'failed', failure_reason: 'no_contact_found' });
          return;
        }
      }

      contact = found;
      await updateLead(id, {
        first_name: contact.first_name,
        last_name: contact.last_name,
        title: contact.title,
        linkedin_url: contact.linkedin_url,
      });
    }

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

    // Calculate composite score (signal + email + company fit)
    // NOTE: composite_score column must be added to pipeline_leads table in Supabase
    //   ALTER TABLE pipeline_leads ADD COLUMN composite_score smallint;
    const { data: companyRow } = await supabase
      .from('companies')
      .select('tam_score')
      .eq('domain', company_domain)
      .maybeSingle();

    const compositeScore = calculateCompositeScore({
      signal_score: lead.signal_score,
      email_score: emailResult.score,
      tam_score: companyRow?.tam_score || null,
    });

    await updateLead(id, { composite_score: compositeScore } as Partial<PipelineLead>);

    // Only push verified or risky emails (risky = catch-all/unconfirmed, still sendable)
    if (emailResult.verdict !== 'valid' && emailResult.verdict !== 'risky') {
      await updateLead(id, { status: 'filtered', failure_reason: `email_verdict_${emailResult.verdict}` });
      return;
    }

    // Reject generic/role mailboxes — these aren't people
    const emailPrefix = emailResult.email.split('@')[0].toLowerCase();
    const GENERIC_PREFIXES = [
      'info', 'sales', 'contact', 'hello', 'support', 'admin', 'team',
      'office', 'help', 'careers', 'hr', 'billing', 'marketing',
      'press', 'media', 'feedback', 'general', 'enquiries', 'our',
      'noreply', 'no-reply', 'donotreply', 'alert', 'notification',
      'ops', 'devops', 'legal', 'compliance', 'webmaster', 'postmaster',
      'abuse', 'security', 'reception', 'accounts', 'service',
    ];
    if (GENERIC_PREFIXES.some(p => emailPrefix === p || emailPrefix.startsWith(`${p}.`))) {
      await updateLead(id, { status: 'filtered', failure_reason: 'generic_mailbox' });
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

    // Quality gate: reject empty/garbage research before pushing
    if (!research?.personalized_opener || research.personalized_opener.length < 20) {
      console.warn(`[processor] Research quality gate failed for ${id}: empty or short opener`);
      await updateLead(id, { status: 'research_failed', failure_reason: 'low_quality_research' });
      return;
    }
    if (!research?.research_summary || research.research_summary.length < 30) {
      console.warn(`[processor] Research quality gate failed for ${id}: empty research summary`);
      await updateLead(id, { status: 'research_failed', failure_reason: 'low_quality_research' });
      return;
    }

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

        // Atomic increment with retry to handle concurrent processing
        let currentCount = activeExp.total_leads || 0;
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data: updated } = await supabase
            .from('ab_experiments')
            .update({ total_leads: currentCount + 1 })
            .eq('id', activeExp.id)
            .eq('total_leads', currentCount) // optimistic lock
            .select('total_leads')
            .single();

          if (updated) {
            currentCount = updated.total_leads - 1;
            break;
          }
          // Re-read on conflict
          const { data: fresh } = await supabase
            .from('ab_experiments')
            .select('total_leads')
            .eq('id', activeExp.id)
            .single();
          currentCount = fresh?.total_leads || currentCount;
        }

        const variantIndex = currentCount % allCampaigns.length;
        finalCampaignId = allCampaigns[variantIndex];

        // Record assignment
        const { error: assignErr } = await supabase.from('ab_experiment_leads').upsert({
          experiment_id: activeExp.id,
          lead_email: emailResult.email,
          variant_index: variantIndex,
          campaign_id: finalCampaignId,
        }, { onConflict: 'experiment_id,lead_email' });
        if (assignErr) console.error('[processor] A/B assignment failed:', assignErr);
      } else {
        // No active experiment — check for a completed one with a declared winner
        const { data: completedExp } = await supabase
          .from('ab_experiments')
          .select('winner_campaign_id')
          .eq('signal_type', signal_type)
          .eq('status', 'completed')
          .not('winner_campaign_id', 'is', null)
          .limit(1)
          .single();

        if (completedExp?.winner_campaign_id) {
          finalCampaignId = completedExp.winner_campaign_id;
        }
      }
    } catch {} // No experiment — use default campaign

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
      instantly_campaign_id: finalCampaignId,
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
      campaign_id: finalCampaignId,
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
