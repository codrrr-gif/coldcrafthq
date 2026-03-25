// src/lib/enrichment/research-agents/perplexity.ts
// Shared Perplexity search helper for all research sub-agents.

export async function searchPerplexity(
  query: string,
  opts?: { maxTokens?: number; systemPrompt?: string },
): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return '';

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

  if (!res.ok) return '';
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
