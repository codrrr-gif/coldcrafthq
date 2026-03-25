// src/lib/signals/domain-resolver.ts
// Resolves a company domain from its name using Perplexity search.
// Used to recover G2/Capterra signals that arrive without a domain.

export async function resolveDomain(companyName: string): Promise<string | null> {
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

    // Clean the response: strip protocol, www., trailing slashes/paths, whitespace
    const domain = raw
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
      .trim();

    // Basic sanity check — must look like a domain
    if (!domain || !domain.includes('.')) return null;

    return domain;
  } catch {
    return null;
  }
}
