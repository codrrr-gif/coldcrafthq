// src/lib/enrichment/research-agents/perplexity.ts
// Shared Perplexity search helper for all research sub-agents.

import { perplexityLimiter } from '@/lib/rate-limiter';

export async function searchPerplexity(
  query: string,
  opts?: { maxTokens?: number; systemPrompt?: string },
): Promise<string> {
  if (!process.env.PERPLEXITY_API_KEY) {
    console.warn('[perplexity] PERPLEXITY_API_KEY not set — skipping search');
    return '';
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;

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
        ...(opts?.systemPrompt
          ? [{ role: 'system' as const, content: opts.systemPrompt }]
          : []),
        { role: 'user' as const, content: query },
      ],
      max_tokens: opts?.maxTokens ?? 500,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => 'unknown');
    console.error(`[perplexity] API error ${res.status}: ${errorBody.substring(0, 200)}`);
    return '';
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
