// src/lib/referrals/extract.ts
// ============================================
// Extracts referred contact info from reply text.
// When someone says "email john@company.com" or
// "talk to Sarah, VP of Sales", we extract it and
// push the referral into the pipeline.
// ============================================

import { supabase } from '@/lib/supabase/client';
import { addLeadsToCampaign, tagLead, deleteLead } from '@/lib/instantly';
import { getCampaignId } from '@/lib/enrichment/campaign-mapper';
import type { SignalType } from '@/lib/gtm/types';
import { findEmail } from '@/lib/finder';
import { notifySlack } from '@/lib/slack';

export interface ExtractedReferral {
  email: string | null;
  name: string | null;
  title: string | null;
  company: string | null;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

/**
 * Extract referred contact details from a reply.
 * Returns null if no referral info found.
 */
export function extractReferral(
  replyText: string,
  originalLeadCompany: string | null
): ExtractedReferral | null {
  const rawEmails = replyText.match(EMAIL_RE);
  // Strip trailing dots from sentence punctuation (e.g. "email sara@co.com.")
  const emails = rawEmails?.map(e => e.replace(/\.+$/, '')) || null;
  // Skip the sender's own email if present — take the first that's different
  const referralEmail = emails?.find(e => !originalLeadCompany || !e.endsWith(`@${originalLeadCompany}`)) || emails?.[0] || null;

  // Try to extract a name near referral keywords
  const namePatterns = [
    /(?:talk to|reach out to|emails?\s+to|email|contact|speak with|connect with|direct\s+(?:your\s+)?(?:emails?\s+)?to)[:\s]+(?:our\s+)?(\w+(?:\s+\w+)?)/i,
    /(?:forward(?:ed|ing)?.*?to)[:\s]+(?:our\s+)?(\w+(?:\s+\w+)?)/i,
    /(\w+(?:\s+\w+)?)\s+(?:handles?|manages?|runs?|oversees?|is in charge of)\s+/i,
  ];

  let referralName: string | null = null;
  for (const pattern of namePatterns) {
    const match = replyText.match(pattern);
    if (match?.[1]) {
      const candidate = match[1].trim();
      // Filter out generic words that aren't names
      if (!['me', 'my', 'our', 'the', 'this', 'that', 'your', 'them'].includes(candidate.toLowerCase())) {
        referralName = candidate;
        break;
      }
    }
  }

  // Try to extract title
  const titlePatterns = [
    /(?:our|the)\s+((?:VP|Director|Head|Chief|Manager|Lead|SVP|EVP|CMO|CTO|CEO|COO|CRO|CFO)\s+(?:of\s+)?[\w\s]+)/i,
    /(\w+(?:\s+\w+)?),?\s+((?:VP|Director|Head|Chief|Manager|Lead|SVP|EVP|CMO|CTO|CEO|COO|CRO|CFO)[\w\s]*)/i,
  ];

  let referralTitle: string | null = null;
  for (const pattern of titlePatterns) {
    const match = replyText.match(pattern);
    if (match) {
      referralTitle = (match[2] || match[1]).trim();
      // If we found a name in the title match too
      if (!referralName && match[2]) referralName = match[1]?.trim() || null;
      break;
    }
  }

  // Must have at least an email or a name to act on
  if (!referralEmail && !referralName) return null;

  return {
    email: referralEmail,
    name: referralName,
    title: referralTitle,
    company: originalLeadCompany,
  };
}

/**
 * Process a referral: look up/find email, push to Instantly campaign,
 * and record in pipeline_leads with source=referral.
 */
export async function processReferral(params: {
  referral: ExtractedReferral;
  sourceLeadEmail: string;
  sourceReplyId: string;
  signalType: string | null;
  companyDomain: string | null;
  personalizedOpener: string | null;
  sourceCampaignId: string | null;
}): Promise<{ success: boolean; email?: string; error?: string }> {
  const { referral, sourceLeadEmail, signalType, companyDomain } = params;

  let email = referral.email;

  // Resolve company domain: source lead → referral email → source email
  const domain = companyDomain
    || (email ? email.split('@')[1] : null)
    || sourceLeadEmail.split('@')[1]
    || null;

  // If we have a name but no email, try to find one
  if (!email && referral.name && (companyDomain || domain)) {
    const parts = referral.name.split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    if (firstName && lastName) {
      try {
        const result = await findEmail(firstName, lastName, domain || companyDomain!);
        if (result.found && result.email) {
          email = result.email;
        }
      } catch {
        // Can't find email — we'll still record the referral for manual follow-up
      }
    }
  }

  if (!email) {
    // No email found — notify for manual handling
    await notifySlack(
      `*Referral detected but no email found*\n` +
      `From: ${sourceLeadEmail}\n` +
      `Referred: ${referral.name || 'unknown'} (${referral.title || 'no title'})\n` +
      `Company: ${referral.company || 'unknown'}\n` +
      `Needs manual lookup.`,
      'info'
    );
    return { success: false, error: 'no_email_found' };
  }

  // Check if this person is already in the system
  const { data: existing } = await supabase
    .from('pipeline_leads')
    .select('id, status')
    .eq('email', email)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { success: true, email, error: 'already_in_pipeline' };
  }

  // Push to same signal campaign, or fall back to the source campaign / default
  const campaignId = (signalType ? getCampaignId(signalType as SignalType) : null)
    || params.sourceCampaignId
    || process.env.CAMPAIGN_ID_DEFAULT
    || null;
  const nameParts = (referral.name || '').split(/\s+/);
  const firstName = nameParts[0] || '';

  if (campaignId) {
    // Build a warm referral opener that mentions who sent us
    const sourceName = params.sourceLeadEmail.split('@')[0].replace(/[._]/g, ' ');
    const opener = firstName
      ? `${firstName}, your colleague ${sourceName} pointed me your way — mentioned you'd be the right person to chat with about outbound.`
      : `Your colleague ${sourceName} suggested I reach out — mentioned you'd be the right person to connect with about this.`;

    await addLeadsToCampaign(campaignId, [{
      email,
      first_name: firstName || undefined,
      last_name: nameParts.slice(1).join(' ') || undefined,
      company_name: referral.company || undefined,
      title: referral.title || undefined,
      personalized_opener: opener,
      signal_type: signalType || undefined,
    }]);
  }

  // Record in pipeline_leads (referral source tracked in signal_summary)
  await supabase.from('pipeline_leads').insert({
    email,
    first_name: (referral.name || '').split(/\s+/)[0] || null,
    last_name: (referral.name || '').split(/\s+/).slice(1).join(' ') || null,
    title: referral.title,
    company_name: referral.company,
    company_domain: domain || companyDomain || email.split('@')[1],
    signal_type: signalType || 'referral',
    signal_summary: `Referral from ${sourceLeadEmail}`,
    status: campaignId ? 'pushed' : 'pending',
    instantly_campaign_id: campaignId || null,
    pushed_at: campaignId ? new Date().toISOString() : null,
    client_id: '00000000-0000-0000-0000-000000000001',
  });

  // Remove original lead from campaign — they referred us elsewhere
  if (params.sourceCampaignId) {
    try {
      await deleteLead(params.sourceCampaignId, sourceLeadEmail);
    } catch (err) {
      console.error(`[referral] Failed to remove source lead ${sourceLeadEmail}:`, err);
    }
    // Tag is best-effort — don't let it block the referral flow
    tagLead(sourceLeadEmail, 'referral-made').catch((err) =>
      console.warn('[referral] tagLead failed (non-blocking):', err));
  }

  // Update source lead status in pipeline_leads
  await supabase.from('pipeline_leads')
    .update({ status: 'referred', updated_at: new Date().toISOString() })
    .eq('email', sourceLeadEmail)
    .in('status', ['pushed', 'contacted', 'replied']);

  await notifySlack(
    `*Referral auto-processed*\n` +
    `From: ${sourceLeadEmail} → ${email}\n` +
    `Name: ${referral.name || 'unknown'} | Title: ${referral.title || 'N/A'}\n` +
    `${campaignId ? 'Pushed to campaign.' : 'Queued as pending (no campaign mapped).'}\n` +
    `Original lead tagged \`referral-made\` and removed from campaign.`,
    'info'
  );

  return { success: true, email };
}
