// ============================================
// Knowledge Base Training — Learn from Revisions
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { supabase } from '../supabase/client';

// Generate embedding for text
async function generateEmbedding(text: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

// Store a training example when human revises an AI draft
export async function storeTrainingExample(
  replyId: string,
  originalAiReply: string,
  revisedReply: string
): Promise<void> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Use Claude to analyze what the human changed and why
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Compare these two email replies and explain what was changed and why:

## AI Draft
${originalAiReply}

## Human Revision
${revisedReply}

Provide a concise analysis (2-3 sentences) of what the human corrected — tone, content, length, approach, etc. This will be used to improve future AI drafts.`,
      },
    ],
  });

  const reasoning =
    response.content[0].type === 'text' ? response.content[0].text.trim() : null;

  // Store the training example
  await supabase.from('training_examples').insert({
    reply_id: replyId,
    original_ai_reply: originalAiReply,
    revised_reply: revisedReply,
    reasoning,
  });
}

// Add a new entry to the knowledge base with embedding
export async function addKnowledgeEntry(
  title: string,
  content: string,
  category: string,
  clientId: string = '00000000-0000-0000-0000-000000000001'
): Promise<{ id: string } | null> {
  const embedding = await generateEmbedding(`${title}\n${content}`);

  const { data, error } = await supabase
    .from('knowledge_base')
    .insert({
      title,
      content,
      category,
      embedding,
      client_id: clientId,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to add knowledge entry:', error);
    return null;
  }

  return data;
}

// Update an existing knowledge base entry
export async function updateKnowledgeEntry(
  id: string,
  title: string,
  content: string,
  category: string
): Promise<boolean> {
  const embedding = await generateEmbedding(`${title}\n${content}`);

  const { error } = await supabase
    .from('knowledge_base')
    .update({
      title,
      content,
      category,
      embedding,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Failed to update knowledge entry:', error);
    return false;
  }

  return true;
}

// Delete a knowledge base entry
export async function deleteKnowledgeEntry(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('knowledge_base')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete knowledge entry:', error);
    return false;
  }

  return true;
}
