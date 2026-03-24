// src/lib/learning/opener-analyzer.ts
// Finds 'interested' replies, extracts opener patterns using Claude.
// Stores results in opener_patterns for few-shot injection in research-agent.

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase/client';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BATCH_SIZE = 5;

export async function analyzeOpeners(): Promise<number> {
  // Find leads with interested replies that have a personalized opener
  const { data: conversations } = await supabase
    .from('conversations')
    .select('lead_id')
    .eq('classification', 'interested')
    .not('lead_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!conversations?.length) return 0;

  const leadIds = [...new Set(conversations.map((c) => c.lead_id as string))];

  // Skip leads already processed
  const { data: existing } = await supabase
    .from('opener_patterns')
    .select('lead_id')
    .in('lead_id', leadIds);

  const processedIds = new Set((existing || []).map((e) => e.lead_id));
  const newIds = leadIds.filter((id) => !processedIds.has(id));
  if (!newIds.length) return 0;

  const { data: leads } = await supabase
    .from('pipeline_leads')
    .select('id, signal_type, personalized_opener, company_industry, company_size, signal_score')
    .in('id', newIds)
    .not('personalized_opener', 'is', null);

  if (!leads?.length) return 0;

  let extracted = 0;

  // Group by signal_type and process in batches
  const grouped: Record<string, typeof leads> = {};
  for (const lead of leads) {
    const st = lead.signal_type || 'unknown';
    grouped[st] = grouped[st] || [];
    grouped[st].push(lead);
  }

  for (const [signalType, group] of Object.entries(grouped)) {
    for (let i = 0; i < group.length; i += BATCH_SIZE) {
      const batch = group.slice(i, i + BATCH_SIZE);
      const openerList = batch.map((l, idx) => `${idx + 1}. "${l.personalized_opener}"`).join('\n');

      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `These cold email openers generated positive "interested" replies. Signal type: ${signalType}.

Openers:
${openerList}

Extract: (a) the core pattern that made these work in 1 sentence, (b) pick the single best example opener word-for-word.
Output JSON only: { "pattern_summary": "...", "example_opener": "..." }`,
          }],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');

        if (parsed.pattern_summary && parsed.example_opener) {
          const bestLead = batch[0];
          await supabase.from('opener_patterns').insert({
            signal_type: signalType,
            pattern_summary: parsed.pattern_summary,
            example_opener: parsed.example_opener,
            lead_id: bestLead.id,
            signal_score: bestLead.signal_score,
            industry: bestLead.company_industry,
            company_size: bestLead.company_size,
          });
          extracted++;
        }
      } catch (err) {
        console.error(`[opener-analyzer] Batch failed for ${signalType}:`, err);
      }
    }
  }

  return extracted;
}
