// src/lib/signals/domain-resolver.ts
// Resolves a company domain from its name using Perplexity search.
// Used to recover G2/Capterra signals that arrive without a domain.
// NOTE: Requires CREATE TABLE domain_cache (company_name TEXT PRIMARY KEY, domain TEXT NOT NULL, resolved_at TIMESTAMPTZ DEFAULT NOW());

import { supabase } from '@/lib/supabase/client';
import { perplexityLimiter } from '@/lib/rate-limiter';

export async function resolveDomain(companyName: string): Promise<string | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return null;

  // Check cache first
  const { data: cached } = await supabase
    .from('domain_cache')
    .select('domain')
    .eq('company_name', companyName.toLowerCase().trim())
    .single();

  if (cached?.domain) {
    return cached.domain;
  }

  try {
    await perplexityLimiter.acquire();

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'user' as const,
            content: `What is the official website domain for the company ${companyName}? Return ONLY the domain (e.g. acme.com), nothing else.`,
          },
        ],
        max_tokens: 50,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content || '';
    if (!raw) return null;

    // Reject AI-generated paragraphs — a domain is never more than ~60 chars
    // and never contains spaces, newlines, or sentence-like patterns
    if (raw.length > 80 || raw.includes('\n') || raw.includes(' the ') || raw.includes(' is ') || raw.includes('I don')) {
      console.warn(`[domain-resolver] Perplexity returned paragraph for "${companyName}", rejecting`);
      return null;
    }

    // Clean the response: strip protocol, www., citation markers, trailing junk
    const domain = raw
      .trim()
      .split(/\s/)[0]              // Take only the first word (handles "acme.com is the...")
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
      .replace(/\[.*$/g, '')       // Perplexity citation markers: domain.com[1][5]
      .replace(/[^a-zA-Z0-9.-]/g, '') // Strip any remaining non-domain chars
      .toLowerCase()
      .trim();

    // Basic sanity check — must look like a domain
    if (!domain || !domain.includes('.') || domain.length < 4 || domain.length > 60) return null;

    // Cache the resolved domain
    if (domain) {
      await supabase
        .from('domain_cache')
        .upsert({
          company_name: companyName.toLowerCase().trim(),
          domain,
          resolved_at: new Date().toISOString(),
        }, { onConflict: 'company_name' })
        .then(null, (err) => console.error('[domain-resolver] Cache write failed:', err));
    }

    return domain;
  } catch {
    return null;
  }
}
