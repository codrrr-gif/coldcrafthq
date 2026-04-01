// src/lib/finder/patterns.ts
// ============================================
// domain_patterns table CRUD.
// Tracks the winning email pattern per domain.
// ============================================

import { supabase } from '@/lib/supabase/client';
import { detectPattern } from './permutations';

// Get cached pattern for a domain (only returns if confidence >= 60)
export async function getCachedPattern(domain: string): Promise<{
  pattern: string;
  confidence: number;
} | null> {
  const { data } = await supabase
    .from('domain_patterns')
    .select('pattern, confidence')
    .eq('domain', domain)
    .maybeSingle();

  if (!data || data.confidence < 60) return null;
  return { pattern: data.pattern, confidence: data.confidence };
}

// Bulk-learn patterns from already-pushed leads (run periodically or on-demand)
export async function seedPatternsFromPushedLeads(): Promise<number> {
  const { data: leads } = await supabase
    .from('pipeline_leads')
    .select('email, first_name, last_name')
    .eq('status', 'pushed')
    .not('email', 'is', null)
    .not('first_name', 'is', null)
    .not('last_name', 'is', null);

  if (!leads?.length) return 0;

  let seeded = 0;
  for (const lead of leads) {
    const domain = lead.email.split('@')[1];
    if (!domain) continue;

    // Only seed if no pattern exists yet
    const existing = await supabase
      .from('domain_patterns')
      .select('id')
      .eq('domain', domain)
      .maybeSingle();

    if (existing?.data) continue;

    const pattern = detectPattern(lead.email, lead.first_name, lead.last_name);
    if (!pattern) continue;

    await supabase.from('domain_patterns').insert({
      domain,
      pattern,
      confidence: 70,
      sample_count: 1,
      last_verified_at: new Date().toISOString(),
    });
    seeded++;
  }
  return seeded;
}

// Record a successfully verified email — updates pattern confidence
export async function updateDomainPattern(
  email: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  const domain = email.split('@')[1];
  if (!domain || !firstName || !lastName) return;

  const pattern = detectPattern(email, firstName, lastName);
  if (!pattern) return;

  const { data: existing } = await supabase
    .from('domain_patterns')
    .select('pattern, confidence, sample_count')
    .eq('domain', domain)
    .maybeSingle();

  if (!existing) {
    await supabase.from('domain_patterns').insert({
      domain,
      pattern,
      confidence: 70,
      sample_count: 1,
      last_verified_at: new Date().toISOString(),
    });
    return;
  }

  // Same pattern confirmed → increase confidence (cap at 98)
  // Different pattern → decrease confidence, update if sample count is small
  const samePattern = existing.pattern === pattern;
  const newSampleCount = existing.sample_count + 1;
  const newConfidence = samePattern
    ? Math.min(existing.confidence + Math.floor(10 / newSampleCount) + 2, 98)
    : Math.max(existing.confidence - 15, 20);
  const newPattern = samePattern
    ? existing.pattern
    : (newSampleCount <= 3 ? pattern : existing.pattern);

  await supabase.from('domain_patterns').update({
    pattern: newPattern,
    confidence: newConfidence,
    sample_count: newSampleCount,
    last_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('domain', domain);
}
